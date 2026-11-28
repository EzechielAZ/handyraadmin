// Edge Function : scenario-assistant
// Agent conversationnel (Gemini) qui rédige des scénarios de test à partir d'une description libre.
// Il pose des questions si nécessaire, puis propose des scénarios au format de l'import du dashboard.
// Secrets : GEMINI_API_KEY (ou GOOGLE_API_KEY), optionnel GEMINI_MODEL (défaut gemini-3.8-flash).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const env = (k: string, d = '') => Deno.env.get(k) ?? d
const KEY = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY')
// Liste officielle des modules (même source que le formulaire manuel : MODULE_SUGGESTIONS du dashboard).
const OFFICIAL = ['MISSIONS', 'PAYMENTS', 'CHAT', 'HPO', 'KYC', 'ADMIN', 'AUTH', 'NOTIFICATIONS', 'PROJECTS', 'ARTISANS', 'USERS',
  'SEARCH', 'WALLET', 'INVOICES', 'QUOTES', 'SUBSCRIPTIONS', 'REPORTS']
const SYNONYMS: Record<string, string> = { PAIEMENT: 'PAYMENTS', PAIEMENTS: 'PAYMENTS', PAYEMENT: 'PAYMENTS', PAYMENT: 'PAYMENTS',
  MESSAGERIE: 'CHAT', NOTIFS: 'NOTIFICATIONS', NOTIFICATION: 'NOTIFICATIONS', MISSION: 'MISSIONS', ARTISAN: 'ARTISANS', FACTURES: 'INVOICES', DEVIS: 'QUOTES' }
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
- Champs d'un scénario : title (obligatoire), summary, module (un module de la liste officielle du contexte), profile (ANY|CLIENT|ARTISAN), priority (P0 critique|P1|P2|P3), scenarioType (FUNCTIONAL|SMOKE|REGRESSION|EXPLORATORY|USABILITY|PERFORMANCE|SECURITY), estimatedMinutes (entier), preconditionsMd, testDataMd, tags (liste), status "READY", steps [{actionMd, expectedMd}].
- MODULE : tu dois choisir EXACTEMENT l'un des modules existants fournis dans le contexte (copie l'orthographe). N'en propose un nouveau (MAJUSCULES, sans accent) que si aucun existant ne convient vraiment, et signale-le dans "message".
- FEATURE : si une feature du contexte correspond au parcours, renseigne "featureCode" avec son code exact ; sinon omets le champ.
- Nouveau scénario : pas de champ "code" (le serveur le génère). Évite les doublons avec les scénarios existants du contexte.
- MODIFICATION d'un scénario existant : le contexte contient son contenu complet. Renvoie-le dans "scenarios" avec son "code" exact et TOUS ses champs (modifiés ou non, étapes complètes). Ne renvoie que les scénarios modifiés.
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

    // Contexte réel de la base : modules, features, scénarios existants, et scénarios cités par code.
    const A = db.schema('admin')
    const [lst, feats] = await Promise.all([
      A.rpc('docs_test_scenario_list', { p_admin_id: adminId, p_page: 1, p_page_size: 200 }),
      A.rpc('docs_feature_list', { p_admin_id: adminId, p_page: 1, p_page_size: 200 }),
    ])
    const existing: any[] = lst.data?.items ?? []
    const features: any[] = (feats.data?.items ?? []).map((f: any) => ({ id: f.id_feature, code: f.code, name: f.name, module: f.module }))
    const modules: string[] = Array.from(new Set([...OFFICIAL, ...features.map((f) => f.module).filter(Boolean)])).sort()
    const lastUser = [...messages].reverse().find((m: any) => m.role !== 'assistant')?.content ?? ''
    const cited = Array.from(new Set(String(lastUser).toUpperCase().match(/\bTS-\d+\b/g) ?? [])).slice(0, 3)
    const details: any[] = []
    for (const c of cited) {
      const { data } = await A.rpc('docs_test_scenario_get', { p_admin_id: adminId, p_ref: c })
      if (data?.scenario) details.push({
        code: data.scenario.code, title: data.scenario.title, summary: data.scenario.summary, module: data.scenario.module,
        featureCode: data.feature?.code, profile: data.scenario.profile, priority: data.scenario.priority, scenarioType: data.scenario.scenario_type,
        estimatedMinutes: data.scenario.estimated_minutes, preconditionsMd: data.scenario.preconditions_md, testDataMd: data.scenario.test_data_md,
        tags: data.scenario.tags, status: data.scenario.status, steps: (data.steps ?? []).map((st: any) => ({ actionMd: st.action_md, expectedMd: st.expected_md })),
      })
    }
    const context = `CONTEXTE DE LA BASE (source de vérité)
Modules officiels (seuls autorisés) : ${modules.join(', ') || '(aucun)'}
Features : ${JSON.stringify(features.map((f) => ({ code: f.code, name: f.name, module: f.module })))}
Scénarios existants : ${JSON.stringify(existing.map((x) => ({ code: x.code, title: x.title, module: x.module })))}
${details.length ? `Scénarios à modifier (contenu actuel) : ${JSON.stringify(details)}` : ''}`

    const contents = messages.slice(-20).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content ?? '').slice(0, 8000) }],
    }))
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM + '\n\n' + context }] },
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
    const norm = (x: string) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const lev = (a: string, b: string) => {
      const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
      for (let j = 1; j <= b.length; j++) d[0][j] = j
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      return d[a.length][b.length]
    }
    const newModules = new Set<string>()
    const fixModule = (m: any) => {
      const raw = String(m ?? '').trim(); if (!raw) return undefined
      const k = norm(raw)
      const hit = modules.find((x) => norm(x) === k) ?? SYNONYMS[k] ?? modules.find((x) => k.length > 3 && lev(norm(x), k) <= 1)
      if (hit) return hit
      newModules.add(raw.toUpperCase()); return raw.toUpperCase()
    }
    const byCode = new Map(existing.map((x) => [String(x.code).toUpperCase(), x]))
    const scenarios = (Array.isArray(parsed.scenarios) ? parsed.scenarios : []).map((s0: any) => {
      const { code, featureCode, ...rest } = s0 || {}
      const hit = code ? byCode.get(String(code).toUpperCase()) : null
      const f = featureCode ? features.find((x) => x.code === featureCode) : null
      const out: any = { status: 'READY', ...rest, module: fixModule(rest.module) }
      if (f) out.featureId = f.id
      if (hit) { out.editId = hit.id_scenario; out.editCode = hit.code }
      return out
    })
    return json({ message: String(parsed.message ?? ''), scenarios, newModules: [...newModules] })
  } catch (e) {
    console.error('[scenario-assistant]', e)
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500)
  }
})
