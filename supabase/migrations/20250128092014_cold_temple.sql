-- Drop existing table and recreate with proper structure
DROP TABLE IF EXISTS requirement_sessions CASCADE;

CREATE TABLE requirement_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  state jsonb NOT NULL DEFAULT '{
    "categories": [],
    "responses": []
  }'::jsonb,
  last_synced timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE requirement_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create requirement sessions"
  ON requirement_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can view own requirement sessions"
  ON requirement_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own requirement sessions"
  ON requirement_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own requirement sessions"
  ON requirement_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add validation trigger
CREATE OR REPLACE FUNCTION validate_requirement_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Set user_id if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Validate user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match the authenticated user''s ID';
  END IF;

  -- Ensure description is not null
  IF NEW.description IS NULL THEN
    NEW.description := '';
  END IF;

  -- Ensure state has required structure
  IF NEW.state IS NULL OR NOT (
    NEW.state ? 'categories' AND 
    NEW.state ? 'responses' AND
    jsonb_typeof(NEW.state->'categories') = 'array' AND
    jsonb_typeof(NEW.state->'responses') = 'array'
  ) THEN
    NEW.state := '{"categories": [], "responses": []}'::jsonb;
  END IF;

  -- Update timestamps
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.last_synced := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_requirement_session_trigger ON requirement_sessions;
CREATE TRIGGER validate_requirement_session_trigger
  BEFORE INSERT OR UPDATE ON requirement_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_requirement_session();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_requirement_sessions_user ON requirement_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_requirement_sessions_updated ON requirement_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_requirement_sessions_last_synced ON requirement_sessions(last_synced);
CREATE INDEX IF NOT EXISTS idx_requirement_sessions_state_gin ON requirement_sessions USING gin (state);