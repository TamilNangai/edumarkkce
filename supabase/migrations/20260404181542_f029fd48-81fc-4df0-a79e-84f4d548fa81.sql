
-- Drop the recursive coordinator policy on teacher_subjects
DROP POLICY IF EXISTS "Coordinators see own class assignments" ON public.teacher_subjects;

-- Recreate without self-reference: coordinators see assignments for classes they are assigned to
-- Use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_coordinator_class_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT class_id FROM public.teacher_subjects WHERE teacher_id = _user_id
$$;

-- Revoke public access
REVOKE EXECUTE ON FUNCTION public.get_coordinator_class_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coordinator_class_ids(uuid) TO authenticated;

-- Coordinators can see all assignments in their assigned classes
CREATE POLICY "Coordinators see own class assignments"
ON public.teacher_subjects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coordinator'::app_role)
  AND class_id IN (SELECT get_coordinator_class_ids(auth.uid()))
);
