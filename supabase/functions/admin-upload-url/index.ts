// Edge Function : admin-upload-url
// Signe une URL d'envoi (PUT) vers Cloudflare R2 pour les images du dashboard (icônes de catégories, logo, cachet).
// Réservé aux administrateurs connectés (JWT + vérification en base). Secrets Cloudflare déjà présents.
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
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const FOLDERS = ['categories', 'settings', 'hardware']
const MAX_BYTES = 5 * 1024 * 1024
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Non authentifié' }, 401)
  try {
    const { folder, fileType, size, adminId } = await req.json()
    const ext = EXT[fileType as string]
    if (!ext) return json({ error: 'Format non autorisé (JPEG, PNG ou WebP)' }, 400)
    if (!FOLDERS.includes(folder)) return json({ error: 'Dossier invalide' }, 400)
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return json({ error: 'Image trop lourde (5 Mo maximum)' }, 400)

    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
    const { error } = await db.schema('admin').rpc('docs_assert_admin', { p_admin_id: adminId, p_domain: null, p_action: 'read' })
    if (error) return json({ error: 'Accès refusé' }, 403)

    const key = `admin/${folder}/${crypto.randomUUID()}.${ext}`
    const uploadUrl = await getSignedUrl(
      s3, new PutObjectCommand({ Bucket: env('CLOUDFLARE_BUCKET'), Key: key, ContentType: fileType }), { expiresIn: 300 },
    )
    return json({ uploadUrl, key, publicUrl: `${env('CLOUDFLARE_PUBLIC_URL')}/${key}` })
  } catch (e) {
    console.error(e)
    return json({ error: 'Erreur serveur' }, 500)
  }
})
