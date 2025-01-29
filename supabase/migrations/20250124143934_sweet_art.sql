/*
  # Add metadata column to projects table

  1. Changes
    - Add JSONB metadata column to projects table
    - Add default empty JSON object
  2. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE projects ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;