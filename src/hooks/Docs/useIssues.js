import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

/* ─── Liste ─── */
export const useIssues = (filters = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.issues.list(filters),
    queryFn: () =>
      adminRpc('docs_issue_list', {
        p_search:     filters.search || null,
        p_status:     filters.status || null,
        p_type:       filters.type || null,
        p_severity:   filters.severity || null,
        p_feature_id: filters.featureId || null,
        p_assignee_id:filters.assigneeId || null,
        p_sort_by:    filters.sortBy || 'created_at',
        p_sort_dir:   (filters.sortDir || 'desc').toUpperCase(),
        p_page:       filters.page || 1,
        p_page_size:  filters.pageSize || 20,
      }),
  })
  return {
    issues:  q.data?.items || [],
    total:   q.data?.total || 0,
    stats:   q.data?.stats || { total: 0, byStatus: {}, bySeverity: {} },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Détail ─── */
export const useIssue = (ref, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.issues.detail(ref),
    queryFn: () => adminRpc('docs_issue_get', { p_ref: ref }),
    enabled: !!ref,
    ...options,
  })
  return {
    issue:    q.data?.issue || null,
    comments: q.data?.comments || [],
    relations:q.data?.relations || [],
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Mutations ─── */
export const useIssueMutations = () => {
  const qc = useQueryClient()
  const invalidateList = () => {
    qc.invalidateQueries({ queryKey: docsKeys.issues.all() })
    qc.invalidateQueries({ queryKey: docsKeys.dashboard() })
  }
  const invalidateDetail = (ref) =>
    qc.invalidateQueries({ queryKey: docsKeys.issues.detail(ref) })

  const create = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_issue_create', {
      p_issue_type:        p.issueType,
      p_title:             p.title,
      p_description_md:    p.descriptionMd,
      p_severity:          p.severity || null,
      p_priority:          p.priority || null,
      p_feature_id:        p.featureId || null,
      p_module:            p.module || null,
      p_reproduction_steps:p.reproductionSteps || null,
      p_environment:       p.environment || null,
      p_related_mission_id:p.relatedMissionId || null,
      p_related_user_id:   p.relatedUserId || null,
      p_related_payment_id:p.relatedPaymentId || null,
      p_labels:            p.labels || [],
    }),
    onSuccess: (data) => {
      invalidateList()
      qc.setQueryData(docsKeys.issues.detail(data.issue.id_issue), {
        issue: data.issue, comments: [], relations: [],
      })
      toast.success(`Issue ${data.issue.code} créée`)
    },
  })

  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_issue_update', { p_issue_id: id, p_payload: payload }),
    onSuccess: (data) => {
      invalidateList()
      invalidateDetail(data.issue.id_issue)
      toast.success('Issue mise à jour')
    },
  })

  const transition = useDocsMutation({
    mutationFn: ({ id, newStatus, reason }) =>
      adminRpc('docs_issue_transition', {
        p_issue_id: id, p_new_status: newStatus, p_reason: reason || null,
      }),
    onSuccess: (data, vars) => {
      invalidateList()
      invalidateDetail(data.issue.id_issue)
      toast.success(`Issue → ${vars.newStatus}`)
    },
  })

  const assign = useDocsMutation({
    mutationFn: ({ id, assigneeId }) =>
      adminRpc('docs_issue_assign', { p_issue_id: id, p_assignee_id: assigneeId }),
    onSuccess: (data) => {
      invalidateList()
      invalidateDetail(data.issue.id_issue)
      toast.success('Issue assignée')
    },
  })

  const addComment = useDocsMutation({
    mutationFn: ({ issueId, contentMd, isInternal }) =>
      adminRpc('docs_issue_comment_add', {
        p_issue_id: issueId, p_content_md: contentMd, p_is_internal: !!isInternal,
      }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.issueId)
      invalidateList()
      toast.success('Commentaire ajouté')
    },
  })

  const updateComment = useDocsMutation({
    mutationFn: ({ commentId, contentMd }) =>
      adminRpc('docs_issue_comment_update', { p_comment_id: commentId, p_content_md: contentMd }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docsKeys.issues.all() })
      toast.success('Commentaire modifié')
    },
  })

  const deleteComment = useDocsMutation({
    mutationFn: (commentId) =>
      adminRpc('docs_issue_comment_delete', { p_comment_id: commentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docsKeys.issues.all() })
      toast.success('Commentaire supprimé')
    },
  })

  const relate = useDocsMutation({
    mutationFn: ({ issueId, relatedId, type }) =>
      adminRpc('docs_issue_relate', {
        p_issue_id: issueId, p_related_id: relatedId, p_type: type,
      }),
    onSuccess: (data, vars) => {
      invalidateDetail(vars.issueId)
      toast.success('Relation ajoutée')
    },
  })

  return {
    create, update, transition, assign,
    addComment, updateComment, deleteComment, relate,
  }
}

/* ─── Constantes de transition (miroir des règles SQL) ─── */
export const ISSUE_TRANSITIONS = {
  OPEN:        ['TRIAGED', 'IN_PROGRESS', 'CLOSED', 'WONT_FIX', 'DUPLICATE', 'DEFERRED'],
  TRIAGED:     ['IN_PROGRESS', 'CLOSED', 'WONT_FIX', 'DUPLICATE', 'DEFERRED', 'OPEN'],
  IN_PROGRESS: ['IN_REVIEW', 'FIXED', 'CLOSED', 'DEFERRED', 'OPEN'],
  IN_REVIEW:   ['FIXED', 'IN_PROGRESS', 'CLOSED'],
  FIXED:       ['VERIFIED', 'REOPENED', 'CLOSED'],
  VERIFIED:    ['CLOSED', 'REOPENED'],
  CLOSED:      ['REOPENED'],
  REOPENED:    ['TRIAGED', 'IN_PROGRESS', 'CLOSED'],
  DEFERRED:    ['OPEN', 'TRIAGED'],
  WONT_FIX:    [],
  DUPLICATE:   [],
}

export const canTransition = (from, to) =>
  (ISSUE_TRANSITIONS[from] || []).includes(to)