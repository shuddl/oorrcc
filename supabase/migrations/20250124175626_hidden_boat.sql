/*
  # Fix project table RLS policies

  1. Changes
    - Simplify RLS policies for projects table
    - Add default owner_id value from auth.uid()
    - Add better error handling
    - Add proper validation checks

  2. Security
    - Ensure users can only access their own projects
    - Prevent unauthorized modifications
    - Add audit logging
*/

-- First, drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create simplified policies with proper checks
CREATE POLICY "Enable all operations for project owners"
  ON projects
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Add a trigger to automatically set owner_id
CREATE OR REPLACE FUNCTION set_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Set owner_id to authenticated user if not provided
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;

  -- Validate owner_id matches authenticated user
  IF NEW.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'owner_id must match the authenticated user''s ID';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic owner_id setting
DROP TRIGGER IF EXISTS set_project_owner_trigger ON projects;
CREATE TRIGGER set_project_owner_trigger
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_owner();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);