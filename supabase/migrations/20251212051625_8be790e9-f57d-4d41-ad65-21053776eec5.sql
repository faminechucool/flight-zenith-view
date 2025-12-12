-- Add ades column to aircraft_data table
ALTER TABLE public.aircraft_data ADD COLUMN ades character varying NOT NULL DEFAULT '';

-- Add reason column to activity_log table for change reasons
ALTER TABLE public.activity_log ADD COLUMN reason text;