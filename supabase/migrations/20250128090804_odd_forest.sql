-- Create requirements session table
CREATE TABLE IF NOT EXISTS requirement_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE requirement_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own requirement sessions"
  ON requirement_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_requirement_sessions_user ON requirement_sessions(user_id);
CREATE INDEX idx_requirement_sessions_updated ON requirement_sessions(updated_at);

-- Add trigger for updated_at
CREATE TRIGGER update_requirement_sessions_updated_at
  BEFORE UPDATE ON requirement_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();