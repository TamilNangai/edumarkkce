
-- Phase 1: Fix students table RLS
DROP POLICY IF EXISTS "Authenticated can view students" ON public.students;

CREATE POLICY "Teachers see assigned class students" ON public.students
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = auth.uid() AND ts.class_id = students.class_id
  )
);

CREATE POLICY "Coordinators see assigned class students" ON public.students
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'coordinator'::app_role) AND EXISTS (
    SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = auth.uid() AND ts.class_id = students.class_id
  )
);

CREATE POLICY "HODs see department students" ON public.students
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hod'::app_role) AND EXISTS (
    SELECT 1 FROM classes c WHERE c.id = students.class_id AND c.department_id = get_user_department(auth.uid())
  )
);

CREATE POLICY "Principals see all students" ON public.students
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role));

-- Phase 1: Fix marks UPDATE policy
DROP POLICY IF EXISTS "Teachers can update own marks" ON public.marks;

CREATE POLICY "Teachers can update assigned marks" ON public.marks
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND auth.uid() = entered_by AND EXISTS (
    SELECT 1 FROM teacher_subjects ts
    JOIN students s ON s.class_id = ts.class_id
    WHERE ts.teacher_id = auth.uid() AND ts.subject_id = marks.subject_id AND s.id = marks.student_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND auth.uid() = entered_by AND EXISTS (
    SELECT 1 FROM teacher_subjects ts
    JOIN students s ON s.class_id = ts.class_id
    WHERE ts.teacher_id = auth.uid() AND ts.subject_id = marks.subject_id AND s.id = marks.student_id
  )
);

-- Phase 1: Fix teacher_subjects visibility
DROP POLICY IF EXISTS "Authenticated can view teacher_subjects" ON public.teacher_subjects;

CREATE POLICY "Teachers see own assignments" ON public.teacher_subjects
FOR SELECT TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "HODs see department assignments" ON public.teacher_subjects
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hod'::app_role) AND EXISTS (
    SELECT 1 FROM subjects sub WHERE sub.id = teacher_subjects.subject_id AND sub.department_id = get_user_department(auth.uid())
  )
);

CREATE POLICY "Coordinators see own class assignments" ON public.teacher_subjects
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'coordinator'::app_role) AND EXISTS (
    SELECT 1 FROM teacher_subjects my_ts WHERE my_ts.teacher_id = auth.uid() AND my_ts.class_id = teacher_subjects.class_id
  )
);

CREATE POLICY "Principals see all assignments" ON public.teacher_subjects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role));

-- Phase 2: Add status field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update handle_new_user to set status=pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email, 'pending');
  RETURN NEW;
END;
$$;

-- Recreate trigger for handle_new_user on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security definer function to check user status
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT status FROM public.profiles WHERE user_id = _user_id
$$;

-- Principals can update profiles (for approval)
DROP POLICY IF EXISTS "Principals can manage profiles" ON public.profiles;
CREATE POLICY "Principals can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role));
