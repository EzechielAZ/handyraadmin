import { supabase } from './supabase'
import { getAdminId } from './admin'

const MAX_SIDE = 1024
/** Redimensionne (côté max 1024 px) en gardant la transparence des PNG/WebP. */
const shrink = (file) => new Promise((resolve, reject) => {
  const img = new Image(); const url = URL.createObjectURL(file)
  img.onload = () => {
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url)
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Image illisible'))), type, 0.9)
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible (format non pris en charge)')) }
  img.src = url
})

/** Envoie une image vers R2 (via admin-upload-url) et retourne son URL publique. folder : categories | settings | hardware */
export const uploadAdminImage = async (file, folder) => {
  const blob = await shrink(file)
  const adminId = await getAdminId()
  const { data, error } = await supabase.functions.invoke('admin-upload-url', { body: { folder, fileType: blob.type, size: blob.size, adminId } })
  let msg = data?.error
  if (!msg && error) { try { msg = (await error.context.json())?.error } catch { msg = error.message } }
  if (msg) throw new Error(error?.context?.status === 404 ? 'Fonction admin-upload-url non déployée' : msg)
  let put
  try { put = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob }) }
  catch { throw new Error('Envoi bloqué (règle CORS du bucket ?)') }
  if (!put.ok) throw new Error(`Envoi refusé (${put.status})`)
  return data.publicUrl
}
