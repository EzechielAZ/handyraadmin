import { Modal, Button, Spinner } from '../../../components/ui'
import {
  AlertCircle, CheckCircle2, Rocket, CheckCircle,
} from 'lucide-react'
import {
  useReleaseReadiness, useReleaseMutations,
} from '../../../hooks/docs'
import { formatPercent } from '../../../utils/docsFormatters'
import styles from './ReleaseReadinessDialog.module.css'

export const ReleaseReadinessDialog = ({
  isOpen,
  onClose,
  releaseId,
  releaseVersion,
  currentStatus,
  onSuccess,
}) => {
  const { readiness, progress, checklistDetail, signoffsDetail,
          isLoading, refetch } = useReleaseReadiness(releaseId, { enabled: isOpen })

  const mutations = useReleaseMutations()

  const canValidate = readiness?.ok && currentStatus !== 'READY'
  const canPublish = currentStatus === 'READY'

  const handleValidate = async () => {
    try {
      await mutations.validate.mutateAsync(releaseId)
      onSuccess?.()
    } catch { /* toast */ }
  }

  const handlePublish = async () => {
    try {
      await mutations.publish.mutateAsync(releaseId)
      onSuccess?.()
    } catch { /* toast */ }
  }

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={mutations.validate.isPending || mutations.publish.isPending}>
        Fermer
      </Button>
      {canValidate && (
        <Button
          variant="primary"
          icon={CheckCircle}
          onClick={handleValidate}
          isLoading={mutations.validate.isPending}
          disabled={!readiness?.ok}
        >
          Valider la release
        </Button>
      )}
      {canPublish && (
        <Button
          variant="primary"
          icon={Rocket}
          onClick={handlePublish}
          isLoading={mutations.publish.isPending}
        >
          Publier
        </Button>
      )}
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Readiness v${releaseVersion}`}
      size="lg"
      footer={footer}
    >
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="md" />
          <span>Vérification en cours…</span>
        </div>
      ) : (
        <div className={styles.body}>
          {/* Statut global */}
          <div className={`${styles.statusBanner} ${readiness?.ok ? styles.ok : styles.blocked}`}>
            {readiness?.ok ? (
              <>
                <CheckCircle2 size={20} />
                <div>
                  <strong>Toutes les conditions sont remplies</strong>
                  <span>La release peut être validée.</span>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <div>
                  <strong>Release non prête</strong>
                  <span>
                    {readiness?.blockers?.length || 0} point{readiness?.blockers?.length > 1 ? 's' : ''} bloquant{readiness?.blockers?.length > 1 ? 's' : ''}.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Blockers */}
          {readiness?.blockers?.length > 0 && (
            <section>
              <h4 className={styles.sectionTitle}>Points bloquants</h4>
              <ul className={styles.blockerList}>
                {readiness.blockers.map((b, i) => (
                  <li key={i} className={styles.blockerItem}>
                    <AlertCircle size={14} />
                    <span>{b.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Stats */}
          {readiness?.stats && (
            <section>
              <h4 className={styles.sectionTitle}>Statistiques</h4>
              <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Checklist obligatoire</span>
                  <span className={styles.statValue}>
                    {readiness.stats.mandatoryUnchecked === 0 ? (
                      <span className={styles.okValue}>Tout est coché</span>
                    ) : (
                      <span className={styles.warnValue}>
                        {readiness.stats.mandatoryUnchecked} non coché{readiness.stats.mandatoryUnchecked > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Sign-offs</span>
                  <span className={styles.statValue}>
                    {readiness.stats.signoffsPending === 0 ? (
                      <span className={styles.okValue}>Tous approuvés</span>
                    ) : (
                      <span className={styles.warnValue}>
                        {readiness.stats.signoffsPending} en attente
                      </span>
                    )}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Features bloquées</span>
                  <span className={styles.statValue}>
                    {readiness.stats.featuresBlocked === 0 ? (
                      <span className={styles.okValue}>0</span>
                    ) : (
                      <span className={styles.dangerValue}>{readiness.stats.featuresBlocked}</span>
                    )}
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Features non terminées</span>
                  <span className={styles.statValue}>
                    {readiness.stats.featuresUnplanned}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Progression */}
          {progress && (
            <section>
              <h4 className={styles.sectionTitle}>Progression</h4>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress.globalPct}%` }}
                />
              </div>
              <span className={styles.progressLabel}>
                {formatPercent(progress.globalPct)} global
              </span>
            </section>
          )}

          {/* Checklist détail */}
          {checklistDetail.length > 0 && (
            <section>
              <h4 className={styles.sectionTitle}>Checklist détaillée</h4>
              <ul className={styles.miniList}>
                {checklistDetail
                  .filter((c) => c.mandatory && !c.checked)
                  .slice(0, 5)
                  .map((c) => (
                    <li key={c.id} className={styles.miniItem}>
                      <AlertCircle size={12} />
                      <span>{c.label}</span>
                    </li>
                  ))}
                {checklistDetail.filter((c) => c.mandatory && !c.checked).length === 0 && (
                  <li className={styles.miniItemOk}>
                    <CheckCircle2 size={12} />
                    <span>Tous les items obligatoires sont cochés</span>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Sign-offs détail */}
          {signoffsDetail.length > 0 && (
            <section>
              <h4 className={styles.sectionTitle}>Sign-offs</h4>
              <ul className={styles.miniList}>
                {signoffsDetail.map((s) => (
                  <li
                    key={s.role}
                    className={s.status === 'APPROVED' ? styles.miniItemOk : styles.miniItem}
                  >
                    {s.status === 'APPROVED' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    <span>
                      {s.role} — {s.status === 'APPROVED' ? 'Approuvé' : s.status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}