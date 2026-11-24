import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getDocsErrorMessage } from '../../lib/docsErrors'

/* ─── Liste ─── */
export const useReleases = (filters = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.releases.list(filters),
    queryFn: () =>
      adminRpc('docs_release_list', {
        p_search:    filters.search || null,
        p_status:    filters.status || null,
        p_sort_by:   filters.sortBy || 'target_date',
        p_sort_dir:  (filters.sortDir || 'desc').toUpperCase(),
        p_page:      filters.page || 1,
        p_page_size: filters.pageSize || 20,
      }),
  })
  return {
    releases: q.data?.items || [],
    total:    q.data?.total || 0,
    stats:    q.data?.stats || { total: 0, byStatus: {}, upcomingCount: 0 },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Détail complet ─── */
export const useRelease = (ref, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.releases.detail(ref),
    queryFn: () => adminRpc('docs_release_get', { p_ref: ref }),
    enabled: !!ref,
    ...options,
  })
  return {
    release:    q.data?.release || null,
    objectives: q.data?.objectives || [],
    features:   q.data?.features || [],
    checklist:  q.data?.checklist || [],
    signoffs:   q.data?.signoffs || [],
    progress:   q.data?.progress || null,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Progression seule ─── */
export const useReleaseProgress = (releaseId, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.releases.progress(releaseId),
    queryFn: () => adminRpc('docs_release_progress', { p_release_id: releaseId }),
    enabled: !!releaseId,
    staleTime: 10_000,
    ...options,
  })
  return {
    progress: q.data?.progress || null,
    isLoading: q.isLoading, isError: q.isError, error: q.error,
  }
}

/* ─── Readiness (avant validation) ─── */
export const useReleaseReadiness = (releaseId, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.releases.readiness(releaseId),
    queryFn: () => adminRpc('docs_release_readiness_report', { p_release_id: releaseId }),
    enabled: !!releaseId,
    staleTime: 5_000,
    ...options,
  })
  return {
    readiness: q.data?.readiness || null,
    progress:  q.data?.progress || null,
    checklistDetail: q.data?.checklistDetail || [],
    signoffsDetail:  q.data?.signoffsDetail || [],
    isLoading: q.isLoading, isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Mutations ─── */
export const useReleaseMutations = () => {
  const qc = useQueryClient()
  const invalidateList = () => {
    qc.invalidateQueries({ queryKey: docsKeys.releases.all() })
    qc.invalidateQueries({ queryKey: docsKeys.dashboard() })
  }
  const invalidateDetail = (ref) => {
    qc.invalidateQueries({ queryKey: docsKeys.releases.detail(ref) })
    qc.invalidateQueries({ queryKey: docsKeys.releases.progress(ref) })
    qc.invalidateQueries({ queryKey: docsKeys.releases.readiness(ref) })
  }

  /* ─── Release ─── */
  const create = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_release_create', {
      p_version:             p.version,
      p_release_type:        p.releaseType,
      p_codename:            p.codename || null,
      p_target_date:         p.targetDate || null,
      p_summary:             p.summary || null,
      p_objectives_md:       p.objectivesMd || null,
      p_previous_release_id: p.previousReleaseId || null,
    }),
    onSuccess: (data) => {
      invalidateList()
      qc.setQueryData(docsKeys.releases.detail(data.release.id_release), {
        release: data.release, objectives: [], features: [],
        checklist: [], signoffs: [], progress: null,
      })
      toast.success(`Release ${data.release.version} créée`)
    },
  })

  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_release_update', { p_release_id: id, p_payload: payload }),
    onSuccess: (data) => {
      invalidateDetail(data.release.id_release)
      invalidateList()
      toast.success('Release mise à jour')
    },
  })

  /* ─── Objectifs ─── */
  const addObjective = useDocsMutation({
    mutationFn: ({ releaseId, title, descriptionMd, sort }) =>
      adminRpc('docs_release_add_objective', {
        p_release_id: releaseId, p_title: title,
        p_description_md: descriptionMd || null, p_sort: sort ?? 0,
      }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Objectif ajouté')
    },
  })

  const achieveObjective = useDocsMutation({
    mutationFn: ({ releaseId, objectiveId }) =>
      adminRpc('docs_release_achieve_objective', { p_objective_id: objectiveId }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Objectif atteint')
    },
  })

  /* ─── Features ─── */
  const addFeature = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_release_add_feature', {
      p_release_id:     p.releaseId,
      p_feature_id:     p.featureId,
      p_title:          p.title,
      p_inclusion_type: p.inclusionType || 'NEW',
      p_priority:       p.priority || null,
      p_description_md: p.descriptionMd || null,
      p_parent_item_id: p.parentItemId || null,
    }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Feature ajoutée à la release')
    },
  })

  const updateFeatureItem = useDocsMutation({
    mutationFn: ({ releaseId, itemId, payload }) =>
      adminRpc('docs_release_update_feature_item', { p_item_id: itemId, p_payload: payload }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Item mis à jour')
    },
  })

  const removeFeature = useDocsMutation({
    mutationFn: ({ releaseId, itemId }) =>
      adminRpc('docs_release_remove_feature', { p_item_id: itemId }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Feature retirée de la release')
    },
  })

  /* ─── Check feature (OPTIMISTIC) ─── */
  const checkFeature = useDocsMutation({
    mutationFn: ({ itemId, note, evidenceUrl }) =>
      adminRpc('docs_release_check_feature', {
        p_item_id: itemId,
        p_note: note || null,
        p_evidence_url: evidenceUrl || null,
      }),
    onMutate: async ({ releaseId, itemId }) => {
      await qc.cancelQueries({ queryKey: docsKeys.releases.detail(releaseId) })
      const prev = qc.getQueryData(docsKeys.releases.detail(releaseId))
      qc.setQueryData(docsKeys.releases.detail(releaseId), (old) => {
        if (!old) return old
        return {
          ...old,
          features: (old.features || []).map((f) =>
            f.id_item === itemId
              ? { ...f, is_checked: true, checked_at: new Date().toISOString() }
              : f,
          ),
        }
      })
      return { prev, releaseId }
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(docsKeys.releases.detail(ctx.releaseId), ctx.prev)
      toast.error(getDocsErrorMessage(err))
    },
    onSuccess: (data) => {
      if (data?.already_checked) toast('Déjà coché', { icon: 'ℹ️' })
    },
    onSettled: (data, err, vars) => {
      invalidateDetail(vars.releaseId)
      invalidateList()
    },
  })

  const uncheckFeature = useDocsMutation({
    mutationFn: ({ releaseId, itemId, reason }) =>
      adminRpc('docs_release_uncheck_feature', {
        p_item_id: itemId, p_reason: reason || null,
      }),
    onMutate: async ({ releaseId, itemId }) => {
      await qc.cancelQueries({ queryKey: docsKeys.releases.detail(releaseId) })
      const prev = qc.getQueryData(docsKeys.releases.detail(releaseId))
      qc.setQueryData(docsKeys.releases.detail(releaseId), (old) => {
        if (!old) return old
        return {
          ...old,
          features: (old.features || []).map((f) =>
            f.id_item === itemId
              ? { ...f, is_checked: false, checked_at: null, checked_by: null }
              : f,
          ),
        }
      })
      return { prev, releaseId }
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(docsKeys.releases.detail(ctx.releaseId), ctx.prev)
      toast.error(getDocsErrorMessage(err))
    },
    onSettled: (data, err, vars) => {
      invalidateDetail(vars.releaseId)
      invalidateList()
    },
  })

  /* ─── Bulk check ─── */
  const bulkCheckFeatures = useDocsMutation({
    mutationFn: ({ itemIds, note }) =>
      adminRpc('docs_release_bulk_check_features', {
        p_item_ids: itemIds, p_note: note || null,
      }),
    onSuccess: (data, vars) => {
      if (vars.releaseId) invalidateDetail(vars.releaseId)
      toast.success(`${data.checked} coché(s)${data.skipped ? `, ${data.skipped} déjà cochés` : ''}`)
    },
  })

  /* ─── Checklist ─── */
  const applyChecklistTemplate = useDocsMutation({
    mutationFn: ({ releaseId, templateId }) =>
      adminRpc('docs_release_apply_checklist_template', {
        p_release_id: releaseId, p_template_id: templateId,
      }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success(`${data.itemsAdded} item(s) ajouté(s)`)
    },
  })

  const checkItem = useDocsMutation({
    mutationFn: ({ itemId, note, evidenceUrl }) =>
      adminRpc('docs_release_check_item', {
        p_item_id: itemId, p_note: note || null, p_evidence_url: evidenceUrl || null,
      }),
    onMutate: async ({ releaseId, itemId }) => {
      await qc.cancelQueries({ queryKey: docsKeys.releases.detail(releaseId) })
      const prev = qc.getQueryData(docsKeys.releases.detail(releaseId))
      qc.setQueryData(docsKeys.releases.detail(releaseId), (old) => {
        if (!old) return old
        return {
          ...old,
          checklist: (old.checklist || []).map((c) =>
            c.id_item === itemId
              ? { ...c, is_checked: true, checked_at: new Date().toISOString() }
              : c,
          ),
        }
      })
      return { prev, releaseId }
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(docsKeys.releases.detail(ctx.releaseId), ctx.prev)
      toast.error(getDocsErrorMessage(err))
    },
    onSettled: (data, err, vars) => {
      invalidateDetail(vars.releaseId)
    },
  })

  /* ─── Sign-offs ─── */
  const addSignoff = useDocsMutation({
    mutationFn: ({ releaseId, role, signerId }) =>
      adminRpc('docs_release_add_signoff', {
        p_release_id: releaseId, p_role: role, p_signer_id: signerId || null,
      }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Sign-off ajouté')
    },
  })

  const approveSignoff = useDocsMutation({
    mutationFn: ({ releaseId, signoffId, comment }) =>
      adminRpc('docs_release_approve_signoff', {
        p_signoff_id: signoffId, p_comment: comment || null,
      }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Sign-off approuvé')
    },
  })

  const rejectSignoff = useDocsMutation({
    mutationFn: ({ releaseId, signoffId, comment }) =>
      adminRpc('docs_release_reject_signoff', {
        p_signoff_id: signoffId, p_comment: comment,
      }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.releaseId)
      toast.success('Sign-off rejeté')
    },
  })

  /* ─── Cycle de vie ─── */
  const validate = useDocsMutation({
    mutationFn: (releaseId) =>
      adminRpc('docs_release_validate', { p_release_id: releaseId }),
    onSuccess: (data) => {
      invalidateDetail(data.release.id_release)
      invalidateList()
      toast.success(`Release ${data.release.version} validée`)
    },
  })

  const publish = useDocsMutation({
    mutationFn: (releaseId) =>
      adminRpc('docs_release_publish', { p_release_id: releaseId }),
    onSuccess: (data) => {
      invalidateDetail(data.release.id_release)
      invalidateList()
      qc.invalidateQueries({ queryKey: docsKeys.features.all() })
      toast.success(
        `Release ${data.release.version} publiée${data.featuresPromoted ? ` · ${data.featuresPromoted} feature(s) en LIVE` : ''}`,
      )
    },
  })

  const rollback = useDocsMutation({
    mutationFn: ({ releaseId, reason }) =>
      adminRpc('docs_release_rollback', { p_release_id: releaseId, p_reason: reason }),
    onSuccess: (data) => {
      invalidateDetail(data.release.id_release)
      invalidateList()
      toast.success(`Rollback effectué sur ${data.release.version}`)
    },
  })

  return {
    create, update,
    addObjective, achieveObjective,
    addFeature, updateFeatureItem, removeFeature,
    checkFeature, uncheckFeature, bulkCheckFeatures,
    applyChecklistTemplate, checkItem,
    addSignoff, approveSignoff, rejectSignoff,
    validate, publish, rollback,
  }
}