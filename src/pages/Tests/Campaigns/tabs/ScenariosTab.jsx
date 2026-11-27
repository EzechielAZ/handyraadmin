import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowUp, ArrowDown, X, Save } from 'lucide-react'
import { Button, Modal } from '../../../../components/ui'
import { StatusBadge, DocsEmptyState } from '../../../../components/docs'
import {
  useTestScenarios, useTestCampaignMutations, SCENARIO_PRIORITY, SCENARIO_PROFILE,
} from '../../../../hooks/tests'
import { useDebounce } from '../../../../hooks/useDebounce'
import styles from '../../Tests.module.css'
import local from '../Campaigns.module.css'

const toItems = (scenarios) => scenarios.map((s) => ({ scenarioId: s.id_scenario, isRequired: s.isRequired, code: s.code, title: s.title, priority: s.priority, profile: s.profile }))

const PickerModal = ({ isOpen, onClose, existingIds, onAdd }) => {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState({})
  const dq = useDebounce(q, 250)
  const { scenarios, isLoading } = useTestScenarios({ search: dq, status: 'READY', pageSize: 100, sortBy: 'code', sortDir: 'asc' }, { enabled: isOpen })
  const available = scenarios.filter((s) => !existingIds.has(s.id_scenario))
  const chosen = available.filter((s) => sel[s.id_scenario])
  const close = () => { setQ(''); setSel({}); onClose() }
  const allSelected = available.length > 0 && chosen.length === available.length
  return (
    <Modal isOpen={isOpen} onClose={close} title="Ajouter des scénarios" size="lg"
      footer={<>
        <Button variant="outline" onClick={close}>Annuler</Button>
        <Button variant="primary" disabled={chosen.length === 0} onClick={() => { onAdd(chosen); close() }}>
          Ajouter {chosen.length > 0 ? `(${chosen.length})` : ''}
        </Button>
      </>}>
      <div className={styles.formSection}>
        <input className={styles.textarea} style={{ minHeight: 0, height: 36 }} placeholder="Rechercher parmi les scénarios prêts…"
          value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un scénario" />
        <label className={local.check2}>
          <input type="checkbox" checked={allSelected}
            onChange={(e) => setSel(e.target.checked ? Object.fromEntries(available.map((s) => [s.id_scenario, true])) : {})} />
          Tout sélectionner ({available.length})
        </label>
        <div className={local.pickList}>
          {isLoading && <div className={local.pickRow}><span /><span className={styles.muted}>Chargement…</span></div>}
          {!isLoading && available.length === 0 && (
            <div className={local.pickRow}><span /><span className={styles.muted}>Aucun scénario prêt disponible. Les brouillons ne peuvent pas être ajoutés.</span></div>
          )}
          {available.map((s) => (
            <label key={s.id_scenario} className={local.pickRow}>
              <input type="checkbox" checked={!!sel[s.id_scenario]} onChange={(e) => setSel((p) => ({ ...p, [s.id_scenario]: e.target.checked }))} />
              <span className={styles.titleCell}>
                <span className={styles.titlePrimary}>{s.title}</span>
                <span className={styles.titleMeta}>{s.code}{s.module ? ` · ${s.module}` : ''} · {s.stepCount} étape(s)</span>
              </span>
              <span className={styles.badges}>
                <StatusBadge map={SCENARIO_PROFILE} value={s.profile} showIcon={false} />
                <StatusBadge map={SCENARIO_PRIORITY} value={s.priority} showIcon={false} label={s.priority} />
              </span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export const ScenariosTab = ({ campaign, scenarios, readOnly }) => {
  const { setScenarios } = useTestCampaignMutations()
  const serverItems = useMemo(() => toItems(scenarios), [scenarios])
  const [items, setItems] = useState(serverItems)
  const [pickerOpen, setPickerOpen] = useState(false)
  // resynchronise après enregistrement / rafraîchissement serveur
  useEffect(() => {
    setItems(serverItems)
  }, [serverItems])

  const dirty = JSON.stringify(items.map((i) => [i.scenarioId, i.isRequired])) !== JSON.stringify(serverItems.map((i) => [i.scenarioId, i.isRequired]))
  const move = (i, d) => setItems((p) => { const n = p.slice(); const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n })
  const existing = useMemo(() => new Set(items.map((i) => i.scenarioId)), [items])
  const save = () => setScenarios.mutate({ id: campaign.id_campaign, items: items.map(({ scenarioId, isRequired }) => ({ scenarioId, isRequired })) })

  const required = items.filter((i) => i.isRequired).length
  return (
    <div>
      <div className={local.toolbar}>
        <span className={styles.muted}>
          {items.length} scénario{items.length > 1 ? 's' : ''} · {required} requis pour le go / no-go
        </span>
        {!readOnly && (
          <div className={styles.badges}>
            <Button variant="outline" icon={Plus} onClick={() => setPickerOpen(true)}>Ajouter</Button>
            <Button variant="primary" icon={Save} disabled={!dirty} isLoading={setScenarios.isPending} onClick={save}>Enregistrer</Button>
          </div>
        )}
      </div>

      {dirty && <div className={`${styles.banner} ${styles.bannerWarn}`}>Modifications non enregistrées.</div>}

      {items.length === 0 ? (
        <DocsEmptyState icon="ListChecks" title="Aucun scénario dans cette campagne"
          description="Ajoutez des scénarios « Prêt » de la bibliothèque. Un scénario « requis » compte dans le go / no-go."
          action={!readOnly ? { label: 'Ajouter des scénarios', icon: Plus, onClick: () => setPickerOpen(true) } : undefined} />
      ) : (
        <div className={local.list}>
          {items.map((it, i) => (
            <div key={it.scenarioId} className={local.listRow}>
              <div className={styles.titleCell}>
                <Link to={`/tests/scenarios/${it.code}`} className={styles.titlePrimary}>{i + 1}. {it.title}</Link>
                <span className={styles.titleMeta}>{it.code}</span>
              </div>
              <div className={local.rowTools}>
                <StatusBadge map={SCENARIO_PROFILE} value={it.profile} showIcon={false} />
                <StatusBadge map={SCENARIO_PRIORITY} value={it.priority} showIcon={false} label={it.priority} />
                <label className={local.check2}>
                  <input type="checkbox" checked={it.isRequired} disabled={readOnly}
                    onChange={(e) => setItems((p) => p.map((x, idx) => (idx === i ? { ...x, isRequired: e.target.checked } : x)))} />
                  Requis
                </label>
                {!readOnly && (<>
                  <button type="button" className={styles.iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"><ArrowUp size={13} /></button>
                  <button type="button" className={styles.iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descendre"><ArrowDown size={13} /></button>
                  <button type="button" className={styles.iconBtn} onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} aria-label="Retirer"><X size={13} /></button>
                </>)}
              </div>
            </div>
          ))}
        </div>
      )}

      <PickerModal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} existingIds={existing}
        onAdd={(chosen) => setItems((p) => [...p, ...chosen.map((s) => ({
          scenarioId: s.id_scenario, isRequired: true, code: s.code, title: s.title, priority: s.priority, profile: s.profile }))])} />
    </div>
  )
}

export default ScenariosTab
