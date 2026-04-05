-- 1. Drop the dependent policy first
DROP POLICY IF EXISTS "Coordinators see own class assignments" ON public.teacher_subjects;

-- 2. Drop the old function with parameter
DROP FUNCTION IF EXISTS public.get_coordinator_class_ids(uuid);

-- 3. Recreate without parameter
CREATE OR REPLACE FUNCTION public.get_coordinator_class_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT class_id FROM public.teacher_subjects WHERE teacher_id = auth.uid()
$$;

-- 4. Restrict execute permissions
REVOKE EXECUTE ON FUNCTION public.get_coordinator_class_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coordinator_class_ids() TO authenticated;

-- 5. Recreate the policy using parameterless function
CREATE POLICY "Coordinators see own class assignments"
  ON public.teacher_subjects
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'coordinator'::app_role)
    AND class_id IN (SELECT get_coordinator_class_ids())
  );