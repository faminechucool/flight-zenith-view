-- Migration: Create registration table for aircraft registrations
CREATE TABLE IF NOT EXISTS public.registration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(10) CHECK (status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.registration ENABLE ROW LEVEL SECURITY;

-- Policies for registration table
CREATE POLICY "Enable read access for all users" ON public.registration FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.registration FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.registration FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.registration FOR DELETE USING (true);
