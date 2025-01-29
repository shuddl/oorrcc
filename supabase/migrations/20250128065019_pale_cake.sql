/*
  # Fix user creation trigger

  1. Changes
    - Update user creation trigger to handle edge cases
    - Add error handling
    - Add validation checks
  
  2. Security
    - Maintain RLS policies
    - Add validation checks
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists
  IF EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Insert new user with proper error handling
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't prevent auth user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);