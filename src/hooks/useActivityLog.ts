import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface ActivityLogEntry {
  id: string
  aircraft_id: string
  field_name: string
  old_value: string
  new_value: string
  changed_by: string
  changed_at: string
}

export const useActivityLog = (aircraftId?: string) => {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivityLog = async () => {
    // Skip if Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('changed_at', { ascending: false })

      if (aircraftId) {
        query = query.eq('aircraft_id', aircraftId)
      }

      const { data, error } = await query

      if (error) throw error

      setActivityLog(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity log')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivityLog()
  }, [aircraftId])

  return {
    activityLog,
    loading,
    error,
    refetch: fetchActivityLog
  }
}