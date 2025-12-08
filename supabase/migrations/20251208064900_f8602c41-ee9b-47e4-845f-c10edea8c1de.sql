-- Create aircraft_data table for flight management
CREATE TABLE IF NOT EXISTS public.aircraft_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_number INTEGER NOT NULL,
    month_number INTEGER NOT NULL,
    registration VARCHAR(20) NOT NULL,
    flight_no VARCHAR(20) NOT NULL,
    day VARCHAR(10) NOT NULL,
    date VARCHAR(10) NOT NULL,
    std VARCHAR(5) NOT NULL,
    adep VARCHAR(4) NOT NULL,
    sta VARCHAR(5) NOT NULL,
    operator VARCHAR(100) NOT NULL,
    flight_type VARCHAR(20) CHECK (flight_type IN ('charter', 'schedule', 'acmi')) NOT NULL,
    total_capacity INTEGER NOT NULL,
    capacity_used INTEGER NOT NULL,
    capacity_available INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('operational', 'aog', 'maintenance', 'cancelled')) NOT NULL DEFAULT 'operational',
    client_name VARCHAR(100) NOT NULL,
    contract_id VARCHAR(50) NOT NULL,
    revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_log table for tracking changes
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aircraft_id UUID REFERENCES public.aircraft_data(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'System',
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.aircraft_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this app)
CREATE POLICY "Enable read access for all users" ON public.aircraft_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.aircraft_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.aircraft_data FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.aircraft_data FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.activity_log FOR INSERT WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_aircraft_data_updated_at
    BEFORE UPDATE ON public.aircraft_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();