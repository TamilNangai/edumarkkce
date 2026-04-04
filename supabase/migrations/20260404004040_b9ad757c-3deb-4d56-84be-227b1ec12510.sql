
-- 1. Fix profiles INSERT policy to enforce status = 'pending'
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 1b. Defense-in-depth trigger: force status to 'pending' on insert
CREATE OR REPLACE FUNCTION public.force_pending_status()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_pending ON public.profiles;
CREATE TRIGGER trg_force_pending
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.force_pending_status();

-- 2. Fix coordinator marks SELECT policy to include subject filter
DROP POLICY IF EXISTS "Coordinators can view class marks" ON public.marks;
CREATE POLICY "Coordinators can view class marks"
ON public.marks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'coordinator'::app_role)
  AND EXISTS (
    SELECT 1 FROM teacher_subjects ts
    JOIN students s ON s.class_id = ts.class_id
    WHERE ts.teacher_id = auth.uid()
      AND ts.subject_id = marks.subject_id
      AND s.id = marks.student_id
  )
);

-- 3. Restrict EXECUTE on security definer functions to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_department(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_department(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_status(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.force_pending_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.force_pending_status() TO authenticated;
