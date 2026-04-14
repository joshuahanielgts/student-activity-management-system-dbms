-- Resolve login emails from usernames for username-based sign-in.
CREATE OR REPLACE FUNCTION public.resolve_login_email(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT au.email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE lower(p.register_number) = lower(_identifier)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated, service_role;

-- Ensure every new account has a profile and a default student role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role text;
BEGIN
  selected_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

  IF selected_role NOT IN ('student', 'faculty') THEN
    selected_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, register_number, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'register_number', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
