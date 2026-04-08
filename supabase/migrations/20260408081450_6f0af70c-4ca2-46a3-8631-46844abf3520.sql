CREATE POLICY "HODs can insert department students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'hod'::app_role)
  AND EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = students.class_id
    AND c.department_id = get_user_department(auth.uid())
  )
);