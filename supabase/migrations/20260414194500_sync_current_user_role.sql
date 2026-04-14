-- Synchronize the current authenticated user's role from signup metadata.
-- This keeps older accounts compatible when role rows were not created correctly.
CREATE OR REPLACE FUNCTION public.sync_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
  selected_role text;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(COALESCE(au.raw_user_meta_data->>'role', 'student'))
  INTO selected_role
  FROM auth.users au
  WHERE au.id = current_user_id;

  IF selected_role NOT IN ('student', 'faculty') THEN
    selected_role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN selected_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_current_user_role() TO authenticated, service_role;

-- Backfill missing roles for existing users using signup metadata.
INSERT INTO public.user_roles (user_id, role)
SELECT
  au.id,
  lower(au.raw_user_meta_data->>'role')
FROM auth.users au
WHERE lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('student', 'faculty')
ON CONFLICT (user_id, role) DO NOTHING;
