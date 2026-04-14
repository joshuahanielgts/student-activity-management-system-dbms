-- Speed up case-insensitive username lookup for login.
CREATE INDEX IF NOT EXISTS idx_profiles_register_number_ci
  ON public.profiles (lower(register_number));

-- Update username->email resolver to prefer exact match, then fallback to case-insensitive match.
CREATE OR REPLACE FUNCTION public.resolve_login_email(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH exact_match AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.register_number = _identifier
    LIMIT 1
  ),
  ci_match AS (
    SELECT p.id
    FROM public.profiles p
    WHERE lower(p.register_number) = lower(_identifier)
      AND NOT EXISTS (SELECT 1 FROM exact_match)
    LIMIT 1
  ),
  chosen AS (
    SELECT id FROM exact_match
    UNION ALL
    SELECT id FROM ci_match
    LIMIT 1
  )
  SELECT au.email
  FROM chosen c
  JOIN auth.users au ON au.id = c.id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated, service_role;
