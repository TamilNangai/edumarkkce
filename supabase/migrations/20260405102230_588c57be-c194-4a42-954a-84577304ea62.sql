-- Drop the broad ALL policy that could be misinterpreted
DROP POLICY IF EXISTS "Principals can manage all roles" ON public.user_roles;

-- Add explicit principal-only policies for each operation
CREATE POLICY "Principals can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Principals can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role))
WITH CHECK (has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Principals can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Principals can select all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role));