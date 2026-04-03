
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Principals can view all profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role));
