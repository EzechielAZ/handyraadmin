/**
 * Éditeur d'étapes d'un scénario : ajout, suppression, réordonnancement (↑/↓), numérotation auto.
 * value : [{ actionMd, expectedMd }]  — onChange(nextValue)
 */
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '../../../components/ui'
import styles from '../Tests.module.css'
import local from './Scenarios.module.css'

export const MAX_STEPS = 100

export const StepsEditor = ({ value = [], onChange, errors = {} }) => {
  const set = (i, key, v) => onChange(value.map((s, idx) => (idx === i ? { ...s, [key]: v } : s)))
  const add = () => value.length < MAX_STEPS && onChange([...value, { actionMd: '', expectedMd: '' }])
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i))
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className={local.editor}>
      {value.length === 0 && (
        <p className={styles.hint}>Aucune étape. Décrivez ce que le testeur doit faire et ce qu'il doit observer.</p>
      )}
      <ol className={local.editorList}>
        {value.map((s, i) => (
          <li key={i} className={local.editorItem}>
            <span className={local.editorNum} aria-hidden="true">{i + 1}</span>
            <div className={local.editorFields}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`step-a-${i}`}>Action</label>
                <textarea id={`step-a-${i}`} className={styles.textarea} rows={2} value={s.actionMd}
                  onChange={(e) => set(i, 'actionMd', e.target.value)}
                  placeholder="Ex. Appuyer sur « Publier une mission »" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`step-e-${i}`}>Résultat attendu</label>
                <textarea id={`step-e-${i}`} className={styles.textarea} rows={2} value={s.expectedMd}
                  onChange={(e) => set(i, 'expectedMd', e.target.value)}
                  placeholder="Ex. Le formulaire s'ouvre avec la catégorie préremplie" />
              </div>
              {errors[i] && <span className={styles.fieldError}>{errors[i]}</span>}
            </div>
            <div className={local.editorTools}>
              <button type="button" className={styles.iconBtn} onClick={() => move(i, -1)} disabled={i === 0}
                aria-label={`Monter l'étape ${i + 1}`}><ArrowUp size={13} /></button>
              <button type="button" className={styles.iconBtn} onClick={() => move(i, 1)} disabled={i === value.length - 1}
                aria-label={`Descendre l'étape ${i + 1}`}><ArrowDown size={13} /></button>
              <button type="button" className={styles.iconBtn} onClick={() => remove(i)}
                aria-label={`Supprimer l'étape ${i + 1}`}><Trash2 size={13} /></button>
            </div>
          </li>
        ))}
      </ol>
      <Button variant="outline" icon={Plus} size="sm" onClick={add} disabled={value.length >= MAX_STEPS}>
        Ajouter une étape
      </Button>
    </div>
  )
}

export default StepsEditor
