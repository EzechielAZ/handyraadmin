import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useCategories = (options = {}) => {
  const q = useQuery({
    queryKey: ['categories', { ...options }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id_category, name, parent_id, is_active')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })

  return {
    categories: q.data || [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
  }
}

/**
 * Transforme un tableau plat de catégories en options hiérarchisées
 * (parents + enfants triés). Ajoute un champ `depth` pour le rendu.
 */
export const buildCategoryOptions = (categories, allLabel = 'Toutes catégories') => {
  const byParent = categories.reduce((acc, c) => {
    const key = c.parent_id || '__root__'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const opts = [{ value: 'all', label: allLabel, depth: 0 }]

  const roots = (byParent['__root__'] || [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  roots.forEach(root => {
    opts.push({
      value: root.id_category,
      label: root.name,
      depth: 0,
    })
    const children = (byParent[root.id_category] || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    children.forEach(child => {
      opts.push({
        value: child.id_category,
        label: child.name,
        depth: 1,
      })
    })
  })

  return opts
}