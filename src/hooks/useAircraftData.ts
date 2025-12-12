import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AircraftTableData } from '@/data/mockData'

export const useAircraftData = () => {
  const [aircraft, setAircraft] = useState<AircraftTableData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAircraft = async () => {

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
          ades: item.ades || '',
          sta: item.sta,
          operator: item.operator,
          flightType: item.flight_type as 'charter' | 'schedule' | 'acmi',
          totalCapacity: item.total_capacity,
          capacityUsed: item.capacity_used,
          capacityAvailable: item.capacity_available,
          status: item.status as 'operational' | 'aog' | 'maintenance' | 'cancelled',
          clientName: item.client_name,
          contractId: item.contract_id,
          revenue: item.revenue,
          flightPositioning: (item.flight_positioning as 'live_flight' | 'ferry_flight') || 'live_flight'
        }))
        setAircraft(formattedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch aircraft data')
    } finally {
      setLoading(false)
    }
  }

  const updateAircraft = async (id: string, field: 'registration' | 'flightNo' | 'status' | 'flightType' | 'weekNumber' | 'date' | 'flightPositioning' | 'ades' | 'adep', newValue: string, changedBy: string = 'User', reason?: string) => {

    try {
      const currentAircraft = aircraft.find(a => a.id === id)
      if (!currentAircraft) throw new Error('Aircraft not found')

      const fieldMap: Record<string, { value: string; dbField: string }> = {
        registration: { value: currentAircraft.registration, dbField: 'registration' },
        flightNo: { value: currentAircraft.flightNo, dbField: 'flight_no' },
        status: { value: currentAircraft.status, dbField: 'status' },
        flightType: { value: currentAircraft.flightType, dbField: 'flight_type' },
        weekNumber: { value: String(currentAircraft.weekNumber), dbField: 'week_number' },
        date: { value: currentAircraft.date, dbField: 'date' },
        flightPositioning: { value: currentAircraft.flightPositioning, dbField: 'flight_positioning' },
        day: { value: currentAircraft.day, dbField: 'day' },
        adep: { value: currentAircraft.adep, dbField: 'adep' },
        ades: { value: currentAircraft.ades, dbField: 'ades' }
      }
      
      const oldValue = fieldMap[field]?.value || ''
      const fieldName = fieldMap[field]?.dbField || field

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
          changed_at: new Date().toISOString(),
          reason: reason || null
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

  const updateFlightTimes = async (id: string, newStd: string, newSta: string, changedBy: string = 'User', reason?: string) => {
    try {
      const currentAircraft = aircraft.find(a => a.id === id)
      if (!currentAircraft) throw new Error('Aircraft not found')

      const oldStd = currentAircraft.std
      const oldSta = currentAircraft.sta

      // Update aircraft data with new times
      const { error: updateError } = await supabase
        .from('aircraft_data')
        .update({ 
          std: newStd,
          sta: newSta,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Log the activity for STD change
      await supabase
        .from('activity_log')
        .insert({
          aircraft_id: id,
          field_name: 'std',
          old_value: oldStd,
          new_value: newStd,
          changed_by: changedBy,
          changed_at: new Date().toISOString(),
          reason: reason || null
        })

      // Log the activity for STA change
      await supabase
        .from('activity_log')
        .insert({
          aircraft_id: id,
          field_name: 'sta',
          old_value: oldSta,
          new_value: newSta,
          changed_by: changedBy,
          changed_at: new Date().toISOString(),
          reason: reason || null
        })

      // Refresh data
      await fetchAircraft()
      
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flight times')
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update flight times' }
    }
  }

  const deleteAircraft = async (id: string, changedBy: string = 'User', reason?: string) => {
    try {
      const currentAircraft = aircraft.find(a => a.id === id)
      if (!currentAircraft) throw new Error('Aircraft not found')

      // Log deletion before deleting
      await supabase
        .from('activity_log')
        .insert({
          aircraft_id: null,
          field_name: 'flight_deleted',
          old_value: `${currentAircraft.flightNo} (${currentAircraft.registration})`,
          new_value: 'DELETED',
          changed_by: changedBy,
          changed_at: new Date().toISOString(),
          reason: reason || null
        })

      // Delete the aircraft
      const { error: deleteError } = await supabase
        .from('aircraft_data')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Refresh data
      await fetchAircraft()
      
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete aircraft')
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete aircraft' }
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
    updateFlightTimes,
    deleteAircraft,
    refetch: fetchAircraft
  }
}