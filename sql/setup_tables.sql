-- Create aircraft_data table
CREATE TABLE IF NOT EXISTS public.aircraft_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration VARCHAR(20) NOT NULL,
    flight_no VARCHAR(20) NOT NULL,
    day VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    std TIME NOT NULL,
    adep VARCHAR(4) NOT NULL,
    sta TIME NOT NULL,
    operator VARCHAR(100) NOT NULL,
    flight_type VARCHAR(20) CHECK (flight_type IN ('charter', 'schedule', 'acmi','maintenance','adhoc')) NOT NULL,
    total_capacity INTEGER NOT NULL,
    capacity_used INTEGER NOT NULL,
    capacity_available INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('operational', 'aog', 'maintenance', 'cancelled')) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aircraft_id UUID REFERENCES public.aircraft_data(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO public.aircraft_data (
    registration, flight_no, day, date, std, adep, sta, operator, 
    flight_type, total_capacity, capacity_used, capacity_available, 
    status, client_name
) VALUES 
('N123AB', 'AA1234', 'Monday', '2024-01-15', '14:30', 'JFK', '17:45', 'American Airlines', 'schedule', 180, 156, 24, 'operational', 'American Airlines'),
('N456CD', 'DL5678', 'Tuesday', '2024-01-16', '09:15', 'LAX', '14:30', 'Delta Airlines', 'charter', 150, 138, 12, 'operational', 'Corporate Charter Inc'),
('N789EF', 'UA9012', 'Wednesday', '2024-01-17', '00:00', 'ORD', '00:00', 'United Airlines', 'schedule', 189, 0, 0, 'aog', 'United Airlines'),
('N012GH', 'SW3456', 'Thursday', '2024-01-18', '11:00', 'DEN', '13:45', 'Southwest Airlines', 'acmi', 200, 90, 110, 'maintenance', 'ACMI Leasing Corp'),
('N345IJ', 'AL7890', 'Friday', '2024-01-19', '16:45', 'SEA', '06:30', 'Alaska Airlines', 'schedule', 242, 230, 12, 'operational', 'Alaska Airlines'),
('N678KL', 'BA1234', 'Saturday', '2024-01-20', '22:10', 'MIA', '12:15', 'British Airways', 'charter', 293, 228, 65, 'operational', 'Premium Charter Services'),
('N901MN', 'CA5678', 'Sunday', '2024-01-21', '00:00', 'BOS', '00:00', 'China Airlines', 'schedule', 396, 0, 0, 'cancelled', 'China Airlines'),
('N234OP', 'JB9012', 'Monday', '2024-01-22', '11:20', 'PHX', '14:55', 'JetBlue Airways', 'acmi', 100, 88, 12, 'operational', 'Regional ACMI Solutions')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.aircraft_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON public.aircraft_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.aircraft_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.aircraft_data FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.aircraft_data FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.activity_log FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.activity_log FOR DELETE USING (true);