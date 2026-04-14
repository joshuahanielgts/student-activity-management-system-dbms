-- Faculty-only helper to list student accounts with username and email.
CREATE OR REPLACE FUNCTION public.list_students_for_faculty()
RETURNS TABLE (
  id uuid,
  username text,
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
    p.register_number AS username,
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
