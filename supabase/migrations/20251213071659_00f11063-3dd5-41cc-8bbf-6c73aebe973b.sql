-- Create registrations table
CREATE TABLE public.registrations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    registration character varying NOT NULL UNIQUE,
    status character varying NOT NULL DEFAULT 'active',
    aircraft_type character varying NOT NULL,
    operator character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.registrations FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.registrations FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_registrations_updated_at
    BEFORE UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();