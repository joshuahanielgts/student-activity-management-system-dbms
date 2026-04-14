-- Ensure students can view logs created before profile register number was aligned.
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
    OR lower(student_name) LIKE (
      lower((
        SELECT p.name
        FROM public.profiles p
        WHERE p.id = auth.uid()
        LIMIT 1
      )) || '%'
    )
  );

NOTIFY pgrst, 'reload schema';