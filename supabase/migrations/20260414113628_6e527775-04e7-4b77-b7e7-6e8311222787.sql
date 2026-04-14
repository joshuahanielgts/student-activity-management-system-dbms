
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  register_number text UNIQUE NOT NULL,
  name text NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('faculty','student')) NOT NULL,
  UNIQUE (user_id, role)
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles(id) NOT NULL,
  faculty_id uuid REFERENCES public.profiles(id) NOT NULL,
  activity_name text NOT NULL,
  date date NOT NULL,
  points integer CHECK (points >= 0) NOT NULL,
  proof_url text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_logs_student_id ON public.activity_logs(student_id);
CREATE INDEX idx_logs_faculty_id ON public.activity_logs(faculty_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- user_roles policies
CREATE POLICY "users_read_own_role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- profiles policies
CREATE POLICY "user_own_profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "faculty_all_profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- activity_logs policies
CREATE POLICY "faculty_insert_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'faculty'));

CREATE POLICY "faculty_select_all_logs" ON public.activity_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

CREATE POLICY "student_select_own_logs" ON public.activity_logs
  FOR SELECT USING (student_id = auth.uid());

-- Storage bucket for proof PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', false);

-- Storage policies
CREATE POLICY "faculty_upload_proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'proofs' AND public.has_role(auth.uid(), 'faculty'));

CREATE POLICY "authenticated_read_proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'proofs' AND auth.role() = 'authenticated');

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, register_number, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'register_number', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
