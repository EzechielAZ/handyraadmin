/**
 * Catalogues statiques du module docs.
 * Lecture directe en table (pas d'audit nécessaire, données référentielles).
 */

import { supabase } from '../../lib/supabase'
import { useDocsQuery } from './useDocsQuery'
import { docsKeys } from './keys'

export const useChecklistTemplates = (options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.templates(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .order('category')
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60_000,
    ...options,
  })
  return {
    templates: q.data || [],
    byCategory: (q.data || []).reduce((acc, t) => {
      (acc[t.category] = acc[t.category] || []).push(t)
      return acc
    }, {}),
    isLoading: q.isLoading, isError: q.isError, error: q.error,
  }
}

export const useAllTags = (options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.tags.all(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60_000,
    ...options,
  })
  return {
    tags: q.data || [],
    isLoading: q.isLoading, isError: q.isError, error: q.error,
  }
}