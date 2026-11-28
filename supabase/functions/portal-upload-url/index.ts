// Edge Function : portal-upload-url
// Signe une URL d'envoi (PUT) vers Cloudflare R2 pour les captures d'écran des testeurs.
// Authentification = jeton du lien d'invitation, vérifié côté base (admin.portal_upload_check).
// Secrets utilisés : CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY,
// CLOUDFLARE_BUCKET, CLOUDFLARE_PUBLIC_URL (déjà présents) + SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto).
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.540.0'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.540.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const env = (k: string) => Deno.env.get(k) ?? ''
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env('CLOUDFLARE_ACCESS_KEY_ID'), secretAccessKey: env('CLOUDFLARE_SECRET_ACCESS_KEY') },
})
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_BYTES = 5 * 1024 * 1024
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { token, fileType, size } = await req.json()
    const ext = EXT[fileType as string]
    if (!token || !ext) return json({ error: 'Type de fichier non autorisé (JPEG, PNG ou WebP)' }, 400)
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return json({ error: 'Image trop lourde (5 Mo maximum)' }, 400)

    const { data, error } = await db.schema('admin').rpc('portal_upload_check', { p_token: token })
    if (error) return json({ error: error.message }, 403)

    const key = `tests/${data.testerId}/${crypto.randomUUID()}.${ext}`
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: env('CLOUDFLARE_BUCKET'), Key: key, ContentType: fileType }),
      { expiresIn: 300 },
    )
    return json({ uploadUrl, key, publicUrl: `${env('CLOUDFLARE_PUBLIC_URL')}/${key}` })
  } catch (e) {
    console.error(e)
    return json({ error: 'Erreur serveur' }, 500)
  }
})
