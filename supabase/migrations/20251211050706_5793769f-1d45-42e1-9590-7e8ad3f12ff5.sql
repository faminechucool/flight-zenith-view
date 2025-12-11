-- Add flight_positioning column to aircraft_data table
ALTER TABLE public.aircraft_data 
ADD COLUMN flight_positioning character varying NOT NULL DEFAULT 'live_flight';

-- Add a comment to describe the column
COMMENT ON COLUMN public.aircraft_data.flight_positioning IS 'Flight positioning type: live_flight (with cargo) or ferry_flight (empty/positioning)';