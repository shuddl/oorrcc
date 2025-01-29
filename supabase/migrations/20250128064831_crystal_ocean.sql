/*
  # Fix user creation and project constraints

  1. Changes
    - Add trigger to automatically create user profile on auth.user creation
    - Add trigger to validate project owner exists
    - Add indexes for better performance
  
  2. Security
    - Maintain RLS policies
    - Add validation checks
*/

-- Create trigger function to create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add validation trigger for projects
CREATE OR REPLACE FUNCTION public.validate_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'User with ID % does not exist', NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project owner validation
DROP TRIGGER IF EXISTS validate_project_owner_trigger ON public.projects;
CREATE TRIGGER validate_project_owner_trigger
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_owner();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);