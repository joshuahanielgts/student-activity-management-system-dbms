-- Allow faculty to log achievements by name + register number even before a student account exists.
ALTER TABLE public.activity_logs
  ADD COLUMN student_name text;

ALTER TABLE public.activity_logs
  ADD COLUMN student_register_number text;

-- Backfill snapshot fields for existing logs linked to profiles.
UPDATE public.activity_logs al
SET
  student_name = COALESCE(al.student_name, p.name),
  student_register_number = COALESCE(al.student_register_number, p.register_number)
FROM public.profiles p
WHERE al.student_id = p.id;

ALTER TABLE public.activity_logs
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE public.activity_logs
  ALTER COLUMN student_name SET NOT NULL;

ALTER TABLE public.activity_logs
  ALTER COLUMN student_register_number SET NOT NULL;

CREATE INDEX idx_activity_logs_student_register_number
  ON public.activity_logs (student_register_number);

DROP POLICY IF EXISTS "student_select_own_logs" ON public.activity_logs;

CREATE POLICY "student_select_own_logs" ON public.activity_logs
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR student_register_number = (
      SELECT p.register_number
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- Force PostgREST schema cache reload so new columns are immediately visible to the API.
NOTIFY pgrst, 'reload schema';