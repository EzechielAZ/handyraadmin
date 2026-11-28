// Edge Function : send-tester-email
// E-mails aux testeurs : INVITE (invitation) et REPLY (l'équipe a répondu).
// Appelée depuis le dashboard par un admin connecté ; les droits sont vérifiés en base
// (admin.docs_test_notify_prepare, avec le JWT de l'appelant). Envoi via Resend.
// Secrets : RESEND_API_KEY (+ optionnels TESTS_FROM_EMAIL | WELCOME_FROM_EMAIL, WELCOME_REPLY_TO,
// WHATSAPP_NUMBER, PORTAL_URL). SUPABASE_URL et SUPABASE_ANON_KEY sont fournis automatiquement.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const env = (k: string, d = '') => Deno.env.get(k) ?? d
const RESEND_API_KEY = env('RESEND_API_KEY')
const FROM_EMAIL = env('TESTS_FROM_EMAIL') || env('WELCOME_FROM_EMAIL') || 'Handyra <onboarding@resend.dev>'
const REPLY_TO = env('WELCOME_REPLY_TO', 'contact@handyra.app')
const WHATSAPP = env('WHATSAPP_NUMBER', '+229 01 98 39 75 24')
const PORTAL_URL = env('PORTAL_URL', 'https://staging.handyra.app').replace(/\/$/, '')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Non authentifié' }, 401)

  try {
    const { kind, ref, adminId, source } = await req.json()
    if (!['INVITE', 'REPLY'].includes(kind) || !ref || !adminId) return json({ error: 'Paramètres invalides' }, 400)

    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: auth } }, auth: { persistSession: false },
    })
    const { data: p, error: pErr } = await db.schema('admin').rpc('docs_test_notify_prepare', {
      p_admin_id: adminId, p_kind: kind, p_ref: ref, p_source: source || 'comment',
    })
    if (pErr) return json({ error: pErr.message }, 403)
    if (p?.skipped) return json({ skipped: p.skipped })

    const link = kind === 'INVITE' ? `${PORTAL_URL}/join/${p.token}` : `${PORTAL_URL}/join/${p.token}/retours/${p.finding.code}`
    const mail = kind === 'INVITE' ? inviteMail(p, link) : replyMail(p, link)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [p.to], reply_to: REPLY_TO, ...mail }),
    })
    const out = await res.json().catch(() => ({}))
    await db.schema('admin').rpc('docs_test_notify_result', {
      p_admin_id: adminId, p_notification_id: p.notificationId,
      p_status: res.ok ? 'SENT' : 'FAILED', p_provider_id: out?.id ?? null, p_error: res.ok ? null : JSON.stringify(out),
    })
    if (!res.ok) { console.error('[send-tester-email] Resend:', out); return json({ error: 'Envoi impossible', detail: out }, 502) }
    return json({ sent: true, provider_id: out.id })
  } catch (e) {
    console.error('[send-tester-email]', e)
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500)
  }
})

// ── Gabarits ────────────────────────────────────────────────────────────────
const NAVY = '#1e3a5f'
const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const phone = (s: string) => s.replace(/[^0-9]/g, '')
const first = (n?: string) => (n ?? '').trim().split(' ')[0]

function shell(o: { preheader: string; title: string; body: string; cta: string; ctaUrl: string; foot: string }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
<div style="display:none;font-size:1px;color:#F4F6F9;line-height:1px;max-height:0;opacity:0;overflow:hidden;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;"><tr><td align="center" style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(15,27,45,0.06);">
<tr><td style="background:${NAVY};padding:26px 32px;"><div style="font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:-0.2px;">Handyra</div><div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px;">Programme de tests · Version 1.0.0</div></td></tr>
<tr><td style="padding:28px 32px 8px 32px;"><h1 style="font-size:22px;font-weight:700;color:#0F1B2D;margin:0 0 12px 0;line-height:1.3;">${esc(o.title)}</h1>${o.body}</td></tr>
<tr><td align="center" style="padding:12px 32px 8px 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:12px;background:${NAVY};"><a href="${o.ctaUrl}" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">${esc(o.cta)}</a></td></tr></table></td></tr>
<tr><td style="padding:16px 32px 24px 32px;"><div style="font-size:12px;line-height:18px;color:#64748B;text-align:center;">${o.foot}</div></td></tr>
<tr><td style="padding:0 32px;"><div style="height:1px;background:#E3E8EF;"></div></td></tr>
<tr><td style="padding:20px 32px 28px 32px;"><div style="font-size:12px;line-height:18px;color:#64748B;"><strong style="color:#334155;">Besoin d'aide ?</strong><br>WhatsApp : <a href="https://wa.me/${phone(WHATSAPP)}" style="color:${NAVY};text-decoration:none;">${esc(WHATSAPP)}</a><br>Ou répondez simplement à cet e-mail.</div></td></tr>
<tr><td style="background:#F8FAFC;padding:18px 32px;text-align:center;"><div style="font-size:13px;color:#334155;">À très vite,<br><strong style="color:#0F1B2D;">L'équipe Handyra</strong></div><div style="font-size:10px;color:#94A3B8;margin-top:12px;line-height:16px;">Vous recevez cet e-mail car vous participez aux tests de Handyra.<br>Handyra · Cotonou, Bénin</div></td></tr>
</table></td></tr></table></body></html>`
}

const step = (n: number, t: string, d: string) => `<tr><td style="vertical-align:top;padding:0 12px 14px 0;width:32px;"><div style="width:26px;height:26px;border-radius:13px;background:#EEF3F9;color:${NAVY};font-size:13px;font-weight:700;line-height:26px;text-align:center;">${n}</div></td><td style="vertical-align:top;padding:0 0 14px 0;"><div style="font-size:14px;font-weight:600;color:#0F1B2D;">${esc(t)}</div><div style="font-size:13px;line-height:19px;color:#64748B;">${esc(d)}</div></td></tr>`

function inviteMail(p: any, link: string) {
  const n = first(p.name)
  const subject = n ? `${n}, vous êtes invité(e) à tester Handyra` : 'Vous êtes invité(e) à tester Handyra'
  const intro = `Merci de nous aider à valider la version ${esc(p.campaign.appBuild || '1.0.0')} de Handyra avant son lancement. Vous allez tester l'application comme un vrai utilisateur et nous dire ce qui fonctionne… ou pas.`
  const body = `<p style="font-size:14px;line-height:22px;color:#334155;margin:0 0 20px 0;">${n ? `Bonjour ${esc(n)},<br><br>` : ''}${intro}</p>
<div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 14px 0;">Comment ça marche</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${step(1, 'Ouvrez votre lien sur votre téléphone', 'Aucun compte à créer : le lien est personnel.')}${step(2, 'Suivez vos tests étape par étape', 'Pour chaque étape, touchez OK, Échec ou Bloqué. Cela prend quelques minutes.')}${step(3, 'Signalez tout ce qui cloche', 'Un bug, une idée, un détail confus ? Touchez le bouton + et joignez une capture d\'écran.')}</table>`
  const text = `${n ? `Bonjour ${n},\n\n` : ''}Vous êtes invité(e) à tester Handyra (version ${p.campaign.appBuild || '1.0.0'}).\n\n1. Ouvrez votre lien personnel sur votre téléphone : ${link}\n2. Suivez vos tests étape par étape (OK / Échec / Bloqué)\n3. Signalez tout problème avec le bouton +, captures d'écran possibles\n\nAucun compte à créer. Ne partagez pas ce lien : il est personnel.\n\nBesoin d'aide ? WhatsApp ${WHATSAPP}\n\nL'équipe Handyra`
  return {
    subject, text,
    html: shell({ preheader: 'Votre lien personnel pour tester Handyra, sans compte à créer.', title: n ? `Bonjour ${n}, à vous de jouer` : 'À vous de jouer', body,
      cta: 'Commencer les tests', ctaUrl: link, foot: 'Ce lien est personnel : merci de ne pas le partager.<br>Vous pouvez y revenir à tout moment depuis cet e-mail.' }),
  }
}

function replyMail(p: any, link: string) {
  const n = first(p.name)
  const f = p.finding
  const need = f.status === 'NEED_INFO'
  const subject = need ? `L'équipe Handyra a besoin d'une précision (${f.code})` : `L'équipe Handyra vous a répondu (${f.code})`
  const lead = need ? 'Nous avons besoin d\'un complément pour comprendre votre signalement.'
    : f.status === 'CONFIRMED' ? 'Bonne nouvelle : votre signalement est confirmé.'
    : f.status === 'REJECTED' ? 'Nous avons examiné votre signalement.' : 'Vous avez un nouveau message.'
  const quote = p.message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;"><tr><td style="background:#F4F6F9;border-radius:14px;padding:14px 16px;"><div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px 0;">Message de l'équipe</div><div style="font-size:14px;line-height:21px;color:#0F1B2D;white-space:pre-wrap;">${esc(p.message)}</div></td></tr></table>` : ''
  const body = `<p style="font-size:14px;line-height:22px;color:#334155;margin:0 0 16px 0;">${n ? `Bonjour ${esc(n)},<br><br>` : ''}${lead}</p>
<div style="font-size:13px;color:#64748B;margin:0 0 14px 0;">À propos de : <strong style="color:#0F1B2D;">${esc(f.title)}</strong> <span style="color:#94A3B8;">(${esc(f.code)})</span></div>${quote}`
  const text = `${n ? `Bonjour ${n},\n\n` : ''}${lead}\n\nÀ propos de : ${f.title} (${f.code})\n\n${p.message ? `Message de l'équipe :\n${p.message}\n\n` : ''}${need ? 'Répondez directement ici' : 'Voir la conversation'} : ${link}\n\nL'équipe Handyra`
  return {
    subject, text,
    html: shell({ preheader: p.message ? String(p.message).slice(0, 90) : lead, title: need ? 'Une précision, s\'il vous plaît' : 'L\'équipe vous a répondu', body,
      cta: need ? 'Répondre à l\'équipe' : 'Voir la conversation', ctaUrl: link, foot: 'Touchez le bouton pour ouvrir la conversation dans le portail.' }),
  }
}
