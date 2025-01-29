-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own requirement sessions" ON requirement_sessions;

-- Improve RLS policies with better user handling
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
CREATE INDEX IF NOT EXISTS idx_requirement_sessions_last_synced 
  ON requirement_sessions(last_synced);