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

export const portal = {
  open:     (token, device) => call('portal_open', { p_token: token, p_device: device || null }),
  runGet:   (token, id) => call('portal_run_get', { p_token: token, p_run_id: id }),
  runRecord:(token, id, status, note, steps) =>
    call('portal_run_record', { p_token: token, p_run_id: id, p_status: status, p_note: note ?? null, p_steps: steps ?? null }),
  findingCreate: (token, payload) => call('portal_finding_create', { p_token: token, p_payload: payload }),
  findingGet:    (token, ref) => call('portal_finding_get', { p_token: token, p_ref: ref }),
  findingComment:(token, ref, content) => call('portal_finding_comment', { p_token: token, p_ref: ref, p_content: content }),
}
