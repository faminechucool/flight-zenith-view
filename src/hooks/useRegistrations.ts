import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Registration {
  id: string;
  registration: string;
  status: 'active' | 'inactive';
  aircraftType: string;
  operator: string;
  createdAt: string;
  updatedAt: string;
}

export function useRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registration', { ascending: true });

      if (error) throw error;

      const mapped: Registration[] = (data || []).map((r) => ({
        id: r.id,
        registration: r.registration,
        status: r.status as 'active' | 'inactive',
        aircraftType: r.aircraft_type,
        operator: r.operator,
        createdAt: r.created_at || '',
        updatedAt: r.updated_at || '',
      }));

      setRegistrations(mapped);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to fetch registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const addRegistration = async (data: {
    registration: string;
    status: 'active' | 'inactive';
    aircraftType: string;
    operator: string;
  }) => {
    try {
      const { error } = await supabase.from('registrations').insert({
        registration: data.registration.toUpperCase(),
        status: data.status,
        aircraft_type: data.aircraftType,
        operator: data.operator,
      });

      if (error) throw error;

      toast.success(`Registration ${data.registration} added`);
      await fetchRegistrations();
    } catch (error) {
      console.error('Error adding registration:', error);
      toast.error('Failed to add registration');
      throw error;
    }
  };

  const updateRegistration = async (
    id: string,
    data: Partial<{
      registration: string;
      status: 'active' | 'inactive';
      aircraftType: string;
      operator: string;
    }>
  ) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.registration) updateData.registration = data.registration.toUpperCase();
      if (data.status) updateData.status = data.status;
      if (data.aircraftType) updateData.aircraft_type = data.aircraftType;
      if (data.operator) updateData.operator = data.operator;

      const { error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Registration updated');
      await fetchRegistrations();
    } catch (error) {
      console.error('Error updating registration:', error);
      toast.error('Failed to update registration');
      throw error;
    }
  };

  const deleteRegistration = async (id: string) => {
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', id);

      if (error) throw error;

      toast.success('Registration deleted');
      await fetchRegistrations();
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast.error('Failed to delete registration');
      throw error;
    }
  };

  const activeRegistrations = registrations.filter((r) => r.status === 'active');

  return {
    registrations,
    activeRegistrations,
    loading,
    addRegistration,
    updateRegistration,
    deleteRegistration,
    refetch: fetchRegistrations,
  };
}
