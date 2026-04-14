-- Public leaderboard for all visitors (anon + authenticated).
CREATE OR REPLACE FUNCTION public.get_public_leaderboard()
RETURNS TABLE (
  student_name text,
  student_register_number text,
  total_points bigint,
  activity_count bigint,
  last_activity_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized_logs AS (
    SELECT
      NULLIF(TRIM(al.student_register_number), '') AS register_number,
      NULLIF(TRIM(al.student_name), '') AS entered_name,
      al.points,
      al.date,
      al.created_at
    FROM public.activity_logs al
  ),
  grouped AS (
    SELECT
      nl.register_number,
      SUM(nl.points)::bigint AS total_points,
      COUNT(*)::bigint AS activity_count,
      MAX(nl.date) AS last_activity_date
    FROM normalized_logs nl
    WHERE nl.register_number IS NOT NULL
    GROUP BY nl.register_number
  ),
  latest_names AS (
    SELECT DISTINCT ON (nl.register_number)
      nl.register_number,
      COALESCE(nl.entered_name, nl.register_number) AS display_name
    FROM normalized_logs nl
    WHERE nl.register_number IS NOT NULL
    ORDER BY nl.register_number, nl.created_at DESC NULLS LAST
  )
  SELECT
    COALESCE(ln.display_name, g.register_number) AS student_name,
    g.register_number AS student_register_number,
    g.total_points,
    g.activity_count,
    g.last_activity_date
  FROM grouped g
  LEFT JOIN latest_names ln ON ln.register_number = g.register_number
  ORDER BY g.total_points DESC, g.activity_count DESC, g.last_activity_date DESC NULLS LAST, g.register_number ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';