/*
  # Fix RLS policies and add debugging

  1. Changes
    - Drop and recreate all RLS policies with proper checks
    - Add logging trigger for debugging
    - Add default owner_id value from auth.uid()
    - Add validation checks

  2. Security
    - Ensure RLS is properly enabled
    - Validate owner_id matches auth.uid()
    - Add proper security policies
*/

-- Add logging function for debugging
CREATE OR REPLACE FUNCTION log_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    action,
    user_id,
    old_data,
    new_data
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  action text NOT NULL,
  user_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add audit trigger to projects table
DROP TRIGGER IF EXISTS projects_audit_trigger ON projects;
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_action();

-- Ensure owner_id has a default value
ALTER TABLE projects 
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper checks
CREATE POLICY "Users can read own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
  );

CREATE POLICY "Users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (owner_id IS NULL OR owner_id = auth.uid())
  );

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    owner_id = auth.uid()
  );

CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Add validation trigger
CREATE OR REPLACE FUNCTION validate_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;

  IF NEW.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'owner_id must match the authenticated user''s ID';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_project_owner_trigger ON projects;
CREATE TRIGGER validate_project_owner_trigger
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION validate_project_owner();