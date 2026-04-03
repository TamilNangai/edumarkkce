import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';

export function useTeacherSubjects() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['teacher_subjects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select('*, subjects(*), classes(*)')
        .eq('teacher_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useStudentsByClass(classId: string | null) {
  return useQuery({
    queryKey: ['students', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useMarks(filters?: { subject_id?: string; exam_id?: string; class_id?: string }) {
  return useQuery({
    queryKey: ['marks', filters],
    queryFn: async () => {
      let query = supabase
        .from('marks')
        .select('*, students(*), subjects(*), exams(*)');
      if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id);
      if (filters?.exam_id) query = query.eq('exam_id', filters.exam_id);
      const { data, error } = await query;
      if (error) throw error;
      // Filter by class_id client-side if needed
      if (filters?.class_id && data) {
        return data.filter((m: any) => m.students?.class_id === filters.class_id);
      }
      return data;
    },
    enabled: true,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useClasses(departmentId?: string) {
  return useQuery({
    queryKey: ['classes', departmentId],
    queryFn: async () => {
      let query = supabase.from('classes').select('*').order('name');
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSubjects(departmentId?: string) {
  return useQuery({
    queryKey: ['subjects', departmentId],
    queryFn: async () => {
      let query = supabase.from('subjects').select('*').order('name');
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
