-- Return student identity details needed by faculty while logging achievements.
DROP FUNCTION IF EXISTS public.list_students_for_faculty();

CREATE FUNCTION public.list_students_for_faculty()
RETURNS TABLE (
  id uuid,
  name text,
  register_number text,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'faculty') THEN
    RAISE EXCEPTION 'Only faculty users can list students';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.register_number,
    au.email
  FROM public.profiles p
  JOIN public.user_roles ur
    ON ur.user_id = p.id
   AND ur.role = 'student'
  JOIN auth.users au
    ON au.id = p.id
  ORDER BY p.register_number ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_students_for_faculty() TO authenticated, service_role;