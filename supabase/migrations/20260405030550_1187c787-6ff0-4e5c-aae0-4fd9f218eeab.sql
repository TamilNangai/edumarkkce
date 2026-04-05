
-- Fix 1: Lock profile self-update to prevent status/department_id escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND department_id IS NOT DISTINCT FROM (
      SELECT p.department_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
    AND status IS NOT DISTINCT FROM (
      SELECT p.status FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

-- Fix 2: Harden get_coordinator_class_ids to use auth.uid() only
CREATE OR REPLACE FUNCTION public.get_coordinator_class_ids(_user_id uuid)
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT class_id FROM public.teacher_subjects WHERE teacher_id = auth.uid()
$$;
