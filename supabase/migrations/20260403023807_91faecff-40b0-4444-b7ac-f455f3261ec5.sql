
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('teacher', 'coordinator', 'hod', 'principal');

-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Teacher-Subject-Class mapping
CREATE TABLE public.teacher_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- Students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  register_number TEXT NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES public.classes(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marks table
CREATE TABLE public.marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  marks_obtained NUMERIC NOT NULL CHECK (marks_obtained >= 0),
  max_marks NUMERIC NOT NULL CHECK (max_marks > 0),
  entered_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, exam_id),
  CHECK (marks_obtained <= max_marks)
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Principals can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Departments policies
CREATE POLICY "Authenticated can view departments"
  ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Classes policies
CREATE POLICY "Authenticated can view classes"
  ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage classes"
  ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Subjects policies
CREATE POLICY "Authenticated can view subjects"
  ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Teacher subjects policies
CREATE POLICY "Authenticated can view teacher_subjects"
  ON public.teacher_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage teacher_subjects"
  ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Students policies
CREATE POLICY "Authenticated can view students"
  ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage students"
  ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Exams policies
CREATE POLICY "Authenticated can view exams"
  ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage exams"
  ON public.exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

-- Marks policies
CREATE POLICY "Teachers can view own assigned marks"
  ON public.marks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.teacher_subjects ts
      JOIN public.students s ON s.class_id = ts.class_id
      WHERE ts.teacher_id = auth.uid()
        AND ts.subject_id = marks.subject_id
        AND s.id = marks.student_id
    )
  );

CREATE POLICY "Coordinators can view class marks"
  ON public.marks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordinator') AND
    EXISTS (
      SELECT 1 FROM public.teacher_subjects ts
      JOIN public.students s ON s.class_id = ts.class_id
      WHERE ts.teacher_id = auth.uid()
        AND s.id = marks.student_id
    )
  );

CREATE POLICY "HODs can view department marks"
  ON public.marks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND
    EXISTS (
      SELECT 1 FROM public.subjects sub
      WHERE sub.id = marks.subject_id
        AND sub.department_id = public.get_user_department(auth.uid())
    )
  );

CREATE POLICY "Principals have full marks access"
  ON public.marks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

CREATE POLICY "Teachers can insert marks for assigned subjects"
  ON public.marks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND
    auth.uid() = entered_by AND
    EXISTS (
      SELECT 1 FROM public.teacher_subjects ts
      JOIN public.students s ON s.class_id = ts.class_id
      WHERE ts.teacher_id = auth.uid()
        AND ts.subject_id = marks.subject_id
        AND s.id = marks.student_id
    )
  );

CREATE POLICY "Teachers can update own marks"
  ON public.marks FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND
    auth.uid() = entered_by
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
