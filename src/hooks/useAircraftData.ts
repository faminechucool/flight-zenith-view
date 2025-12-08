import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { AircraftTableData } from '@/data/mockData'

export const useAircraftData = () => {
  const [aircraft, setAircraft] = useState<AircraftTableData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAircraft = async () => {
    // Skip if Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('aircraft_data')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const formattedData: AircraftTableData[] = data.map(item => ({
          id: item.id,
          weekNumber: item.week_number || 1,
          monthNumber: item.month_number || 1,
          registration: item.registration,
          flightNo: item.flight_no,
          day: item.day,
          date: item.date,
          std: item.std,
          adep: item.adep,
          sta: item.sta,
          operator: item.operator,
          flightType: item.flight_type,
          totalCapacity: item.total_capacity,
          capacityUsed: item.capacity_used,
          capacityAvailable: item.capacity_available,
          status: item.status,
          clientName: item.client_name,
          contractId: item.contract_id,
          revenue: item.revenue
        }))
        setAircraft(formattedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch aircraft data')
    } finally {
      setLoading(false)
    }
  }

  const updateAircraft = async (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType' | 'day', newValue: string, changedBy: string = 'User') => {
    // Skip if Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database not available' }
    }

    try {
      const currentAircraft = aircraft.find(a => a.id === id)
      if (!currentAircraft) throw new Error('Aircraft not found')

      const oldValue = field === 'registration' 
        ? currentAircraft.registration 
        : field === 'flightNo' 
        ? currentAircraft.flightNo 
        : field === 'status'
        ? currentAircraft.status
        : field === 'flightType'
        ? currentAircraft.flightType
        : currentAircraft.day
      
      const fieldName = field === 'registration' 
        ? 'registration' 
        : field === 'flightNo' 
        ? 'flight_no' 
        : field === 'status'
        ? 'status'
        : field === 'flightType'
        ? 'flight_type'
        : 'day'

      // Update aircraft data
      const { error: updateError } = await supabase
        .from('aircraft_data')
        .update({ 
          [fieldName]: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Log the activity
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          aircraft_id: id,
          field_name: field,
          old_value: oldValue,
          new_value: newValue,
          changed_by: changedBy,
          changed_at: new Date().toISOString()
        })

      if (logError) throw logError

      // Refresh data
      await fetchAircraft()
      
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update aircraft')
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update aircraft' }
    }
  }

  useEffect(() => {
    fetchAircraft()
  }, [])

  return {
    aircraft,
    loading,
    error,
    updateAircraft,
    refetch: fetchAircraft
  }
}