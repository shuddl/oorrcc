-- Create enum types for question and response types
CREATE TYPE question_type AS ENUM ('yesno', 'choice', 'text');
CREATE TYPE response_type AS ENUM ('info', 'error', 'success');

-- Create requirement_sessions table first
CREATE TABLE IF NOT EXISTS requirement_sessions (
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

-- Create requirement_categories table
CREATE TABLE requirement_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create requirement_questions table
CREATE TABLE requirement_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES requirement_categories(id) ON DELETE CASCADE,
  question text NOT NULL,
  type question_type NOT NULL DEFAULT 'text',
  choices jsonb,
  details jsonb DEFAULT '[]'::jsonb,
  considerations jsonb DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT true,
  parent_question_id uuid REFERENCES requirement_questions(id),
  parent_answer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_choices CHECK (
    type != 'choice' OR 
    (jsonb_typeof(choices) = 'array' AND jsonb_array_length(choices) > 0)
  )
);

-- Create requirement_responses table
CREATE TABLE requirement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES requirement_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES requirement_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create requirement_logs table
CREATE TABLE requirement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES requirement_sessions(id) ON DELETE CASCADE,
  message text NOT NULL,
  type response_type NOT NULL DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better query performance
DROP INDEX IF EXISTS idx_requirement_sessions_user;
DROP INDEX IF EXISTS idx_requirement_sessions_updated;
CREATE INDEX idx_requirement_questions_category ON requirement_questions(category_id);
CREATE INDEX idx_requirement_questions_parent ON requirement_questions(parent_question_id);
CREATE INDEX idx_requirement_responses_question ON requirement_responses(question_id);
CREATE INDEX idx_requirement_logs_session ON requirement_logs(session_id);
CREATE INDEX idx_requirement_sessions_user_new ON requirement_sessions(user_id);
CREATE INDEX idx_requirement_sessions_updated_new ON requirement_sessions(updated_at);

-- Enable RLS
ALTER TABLE requirement_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view requirement categories"
  ON requirement_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view requirement questions"
  ON requirement_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own responses"
  ON requirement_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requirement_sessions s
      WHERE s.user_id = auth.uid()
      AND s.id = requirement_responses.session_id
    )
  );

CREATE POLICY "Users can view their own logs"
  ON requirement_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requirement_sessions s
      WHERE s.user_id = auth.uid()
      AND s.id = requirement_logs.session_id
    )
  );

-- Add trigger functions for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_requirement_categories_updated_at
  BEFORE UPDATE ON requirement_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirement_questions_updated_at
  BEFORE UPDATE ON requirement_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();