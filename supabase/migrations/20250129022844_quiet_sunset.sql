/*
  # Add Health Check Table and Function

  1. New Tables
    - `health_check` table for simple status checks
      - `id` (serial, primary key)
      - `last_updated` (timestamptz)

  2. New Functions
    - `ping()` function for simple health checks

  3. Changes
    - Adds initial health check record
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create health_check table
CREATE TABLE IF NOT EXISTS public.health_check (
  id serial PRIMARY KEY,
  last_updated timestamptz DEFAULT now()
);

-- Insert initial record
INSERT INTO public.health_check (id) VALUES (1)
ON CONFLICT DO NOTHING;

-- Create ping function
CREATE OR REPLACE FUNCTION public.ping()
RETURNS boolean AS $$
BEGIN
  RETURN true;
END;
$$ LANGUAGE plpgsql;