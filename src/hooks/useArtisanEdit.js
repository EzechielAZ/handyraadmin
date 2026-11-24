import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'

const rpc = (name, args) => supabase.schema('admin').rpc(name, args)

export function useArtisanEdit(artisanId, isOpen) {
  const [options, setOptions] = useState({ categories: [], badges: [] })
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (!isOpen || loaded.current) return
    let cancelled = false
    ;(async () => {
      setLoadingOptions(true)
      try {
        const adminId = await getAdminId()
        const { data, error } = await rpc('artisan_edit_options', { p_admin_id: adminId })
        if (error) throw error
        if (!cancelled) {
          setOptions({ categories: data?.categories ?? [], badges: data?.badges ?? [] })
          loaded.current = true
        }
      } catch {
        /* les sélecteurs restent vides ; le save échouera proprement si droits insuffisants */
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen])

  const save = useCallback(async (payload, reason) => {
    setSaving(true)
    try {
      const adminId = await getAdminId()
      const { data, error } = await rpc('artisan_update', {
        p_artisan_id: artisanId,
        p_admin_id: adminId,
        p_payload: payload,
        p_reason: reason || null,
      })
      if (error) throw error
      return data
    } finally {
      setSaving(false)
    }
  }, [artisanId])

  return { options, loadingOptions, saving, save }
}