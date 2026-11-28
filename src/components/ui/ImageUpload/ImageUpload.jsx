import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, Image as ImageIcon } from 'lucide-react'
import { uploadAdminImage } from '../../../lib/uploadImage'
import s from './ImageUpload.module.css'

/** Champ image : aperçu + envoi vers R2. value = URL publique, onChange(url | ''). folder : categories | settings | hardware */
export const ImageUpload = ({ value, onChange, folder, label, hint = 'JPEG, PNG ou WebP · 5 Mo max' }) => {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try { onChange(await uploadAdminImage(f, folder)) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className={s.wrap}>
      <div className={s.preview}>{value ? <img src={value} alt={label || ''} /> : <ImageIcon size={22} />}</div>
      <div className={s.body}>
        <div className={s.actions}>
          <button type="button" className={s.btn} onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={15} className={s.spin} /> : <ImagePlus size={15} />}
            {busy ? 'Envoi…' : value ? 'Remplacer' : 'Choisir une image'}
          </button>
          {value && !busy && <button type="button" className={`${s.btn} ${s.danger}`} onClick={() => onChange('')}><Trash2 size={15} />Retirer</button>}
        </div>
        {err ? <span className={s.err} role="alert">{err}</span> : <span className={s.hint}>{hint}</span>}
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
      </div>
    </div>
  )
}
export default ImageUpload
