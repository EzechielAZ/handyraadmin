import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

/* ─── Tags d'une entité ─── */
export const useEntityTags = (entityType, entityId, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.tags.forEntity(entityType, entityId),
    queryFn: () =>
      adminRpc('docs_tag_list_for_entity', {
        p_entity_type: entityType, p_entity_id: entityId,
      }),
    enabled: !!(entityType && entityId),
    staleTime: 60_000,
    ...options,
  })
  return {
    tags: q.data?.tags || [],
    isLoading: q.isLoading, isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Mutations tags ─── */
export const useTagMutations = () => {
  const qc = useQueryClient()
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: [...docsKeys.all(), 'tags'] })
  }

  const create = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_tag_create', {
      p_name: p.name, p_color: p.color || null, p_description: p.description || null,
    }),
    onSuccess: () => { invalidateAll(); toast.success('Tag créé') },
  })

  const attach = useDocsMutation({
    mutationFn: ({ tagId, entityType, entityId }) =>
      adminRpc('docs_tag_attach', {
        p_tag_id: tagId, p_entity_type: entityType, p_entity_id: entityId,
      }),
    onSuccess: () => { invalidateAll(); toast.success('Tag attaché') },
  })

  const detach = useDocsMutation({
    mutationFn: (taggableId) =>
      adminRpc('docs_tag_detach', { p_taggable_id: taggableId }),
    onSuccess: () => { invalidateAll(); toast.success('Tag retiré') },
  })

  return { create, attach, detach }
}

/* ─── Refs génériques ─── */
export const useEntityReferences = (sourceType, sourceId, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.entityReferences.forSource(sourceType, sourceId),
    queryFn: () =>
      adminRpc('docs_entity_reference_list', {
        p_source_type: sourceType, p_source_id: sourceId,
      }),
    enabled: !!(sourceType && sourceId),
    staleTime: 60_000,
    ...options,
  })
  return {
    references: q.data?.references || [],
    isLoading: q.isLoading, isError: q.isError, error: q.error,
  }
}

export const useEntityReferenceMutations = () => {
  const qc = useQueryClient()
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: [...docsKeys.all(), 'references'] })

  const add = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_entity_reference_add', {
      p_source_type:   p.sourceType,
      p_source_id:     p.sourceId,
      p_target_schema: p.targetSchema || 'public',
      p_target_table:  p.targetTable,
      p_target_id:     p.targetId,
      p_description:   p.description || null,
    }),
    onSuccess: () => { invalidate(); toast.success('Référence ajoutée') },
  })

  const remove = useDocsMutation({
    mutationFn: (id) =>
      adminRpc('docs_entity_reference_remove', { p_reference_id: id }),
    onSuccess: () => { invalidate(); toast.success('Référence retirée') },
  })

  return { add, remove }
}