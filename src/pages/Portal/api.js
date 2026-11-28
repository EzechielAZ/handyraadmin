import { supabase } from '../../lib/supabase'

const call = async (fn, args) => {
  const { data, error } = await supabase.schema('admin').rpc(fn, args)
  if (error) throw new Error(error.message || 'Erreur réseau')
  return data
}

export const detectDevice = () => {
  const ua = navigator.userAgent || ''
  const platform = /iPhone|iPad|iPod/i.test(ua) ? 'IOS' : /Android/i.test(ua) ? 'ANDROID' : null
  const m = ua.match(/Android[^;]*;\s*([^;)]+?)\s*(?:Build|\))/)
  const os = ua.match(/(?:Android|OS)\s([\d._]+)/)
  return { platform, deviceModel: m?.[1] || null, osVersion: os?.[1]?.replace(/_/g, '.') || null }
}

const MAX_SIDE = 1600
/** Réduit l'image (côté max 1600 px, JPEG ~0,82) : envoi rapide même en 3G. */
export const compressImage = (file) => new Promise((resolve, reject) => {
  const img = new Image(); const url = URL.createObjectURL(file)
  img.onload = () => {
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url)
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Image illisible'))), 'image/jpeg', 0.82)
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')) }
  img.src = url
})

export const uploadImage = async (token, file) => {
  let blob
  try { blob = await compressImage(file) } catch { throw new Error('Image illisible (format non pris en charge)') }
  // Étape 1 : URL signée (Edge Function)
  const { data, error } = await supabase.functions.invoke('portal-upload-url', { body: { token, fileType: 'image/jpeg', size: blob.size } })
  if (error || data?.error) {
    let msg = data?.error
    if (!msg && error?.context?.json) { try { msg = (await error.context.json())?.error } catch { /* ignore */ } }
    const status = error?.context?.status
    if (status === 404) throw new Error('Signature : fonction portal-upload-url introuvable (non déployée ?)')
    throw new Error(`Signature${status ? ` (${status})` : ''} : ${msg || error?.message || 'réponse invalide'}`)
  }
  // Étape 2 : envoi direct vers R2
  let put
  try { put = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob }) }
  catch { throw new Error('Envoi R2 bloqué (règle CORS du bucket ?)') }
  if (!put.ok) throw new Error(`Envoi R2 refusé (${put.status}) — clés ou permissions du bucket`)
  return { key: data.key, url: data.publicUrl, contentType: 'image/jpeg', size: blob.size }
}

export const portal = {
  findingAttach: (token, ref, items) => call('portal_finding_attach', { p_token: token, p_ref: ref, p_items: items }),
  open:     (token, device) => call('portal_open', { p_token: token, p_device: device || null }),
  runGet:   (token, id) => call('portal_run_get', { p_token: token, p_run_id: id }),
  runRecord:(token, id, status, note, steps) =>
    call('portal_run_record', { p_token: token, p_run_id: id, p_status: status, p_note: note ?? null, p_steps: steps ?? null }),
  findingCreate: (token, payload) => call('portal_finding_create', { p_token: token, p_payload: payload }),
  findingGet:    (token, ref) => call('portal_finding_get', { p_token: token, p_ref: ref }),
  findingComment:(token, ref, content) => call('portal_finding_comment', { p_token: token, p_ref: ref, p_content: content }),
}
