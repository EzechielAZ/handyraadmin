// Edge Function : scenario-assistant
// Agent conversationnel (Gemini) qui rédige des scénarios de test à partir d'une description libre.
// Il pose des questions si nécessaire, puis propose des scénarios au format de l'import du dashboard.
// Secrets : GEMINI_API_KEY (ou GOOGLE_API_KEY), optionnel GEMINI_MODEL (défaut gemini-3.8-flash).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const env = (k: string, d = '') => Deno.env.get(k) ?? d
const KEY = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY')
const MODEL = env('GEMINI_MODEL', 'gemini-3.8-flash')
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SYSTEM = `Tu es l'assistant QA de Handyra, une application mobile (React Native) qui met en relation des clients et des artisans au Bénin.
Ta mission : transformer la description d'un responsable en scénarios de test de validation clairs, exécutables par un testeur non technique sur son téléphone.

Règles :
- Réponds TOUJOURS en JSON : {"message": string, "scenarios": []}.
- "message" : court, en français, tutoiement interdit (vouvoiement), sans jargon.
- Si la description est trop vague pour écrire des étapes fiables (écrans, rôle client/artisan, données, résultat attendu), pose au maximum 3 questions précises dans "message" et laisse "scenarios" vide. Sinon ne pose pas de question : propose directement les scénarios.
- Un scénario = un parcours de 3 à 12 étapes. Chaque étape : une seule action concrète (actionMd) et un résultat observable (expectedMd).
- Ne jamais inventer d'écran ou de bouton dont l'existence est incertaine : formule de façon générique ou pose la question.
- Champs d'un scénario : title (obligatoire), summary, module (MAJUSCULES courtes : AUTH, PROFIL, SERVICES, RESERVATION, PAIEMENT, MESSAGERIE, NOTIFS, AVIS…), profile (ANY|CLIENT|ARTISAN), priority (P0 critique|P1|P2|P3), scenarioType (FUNCTIONAL|SMOKE|REGRESSION|EXPLORATORY|USABILITY|PERFORMANCE|SECURITY), estimatedMinutes (entier), preconditionsMd, testDataMd, tags (liste), status "READY", steps [{actionMd, expectedMd}].
- Pas de champ "code" : le serveur le génère.
- Quand tu proposes des scénarios, "message" résume en une ou deux phrases ce que tu as prévu, et invite à demander des modifications.
- Si on te demande une modification, renvoie la liste complète et corrigée des scénarios.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Non authentifié' }, 401)
  if (!KEY) return json({ error: 'Clé Gemini absente (GEMINI_API_KEY)' }, 500)
  try {
    const { messages, adminId } = await req.json()
    if (!Array.isArray(messages) || !messages.length || !adminId) return json({ error: 'Paramètres invalides' }, 400)

    // Garde d'accès : l'appelant doit avoir le droit d'écriture sur le module (liste vide = aucun effet).
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
    const { error: gErr } = await db.schema('admin').rpc('docs_test_scenario_import', { p_admin_id: adminId, p_items: [], p_dry_run: true })
    if (gErr) return json({ error: 'Accès refusé' }, 403)

    const contents = messages.slice(-20).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content ?? '').slice(0, 8000) }],
    }))
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 16000 },
    })
    // Modèle principal, puis gemini-2.5-flash-lite en secours (modèle retiré, quota, surcharge…).
    let res: Response | null = null; let out: any = {}
    for (const model of [MODEL, 'gemini-2.5-flash-lite']) {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      })
      out = await res.json().catch(() => ({}))
      if (res.ok) break
      console.error('[scenario-assistant] Gemini', model, res.status, out)
      await new Promise((r) => setTimeout(r, 800))
    }
    if (!res || !res.ok) return json({ error: out?.error?.message || 'Gemini indisponible' }, 502)
    const raw = out?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? ''
    let parsed: any
    try { parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) } catch { return json({ error: 'Réponse illisible, reformulez votre demande' }, 502) }
    const scenarios = (Array.isArray(parsed.scenarios) ? parsed.scenarios : []).map((s: any) => { const { code: _c, ...rest } = s || {}; return { status: 'READY', ...rest } })
    return json({ message: String(parsed.message ?? ''), scenarios })
  } catch (e) {
    console.error('[scenario-assistant]', e)
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500)
  }
})
