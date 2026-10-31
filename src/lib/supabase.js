import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper for error handling
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  
  if (error.code === 'PGRST116') {
    return { data: null, error: new Error('Resource not found') }
  }
  
  if (error.code === '23505') {
    return { data: null, error: new Error('Duplicate entry') }
  }
  
  if (error.code === '42501') {
    return { data: null, error: new Error('Permission denied') }
  }
  
  return { data: null, error }
}