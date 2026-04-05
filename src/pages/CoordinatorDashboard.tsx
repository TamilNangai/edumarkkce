import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, BarChart3, Search } from 'lucide-react';

export default function CoordinatorDashboard() {
  const { user } = useAuthStore();
  const [selectedExam, setSelectedExam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: assignments, isLoading: assignLoading } = useQuery({
    queryKey: ['coordinator_assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('teacher_subjects').select('*, subjects(*), classes(*)').eq('teacher_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const classIds = useMemo(() => {
    const ids = new Set<string>();
    assignments?.forEach((a: any) => ids.add(a.class_id));
    return Array.from(ids);
  }, [assignments]);

  const assignedClass = assignments?.[0]?.classes;

  const { data: students } = useQuery({
    queryKey: ['coordinator_students', classIds],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const { data, error } = await supabase.from('students').select('*').in('class_id', classIds).order('name');
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: marks } = useQuery({
    queryKey: ['coordinator_marks', classIds, selectedExam],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const studentIds = (students || []).map((s: any) => s.id);
      if (studentIds.length === 0) return [];
      let query = supabase.from('marks').select('*, students(*), subjects(*), exams(*)').in('student_id', studentIds);
      if (selectedExam) query = query.eq('exam_id', selectedExam);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0 && !!students,
  });

  const filtered = useMemo(() => {
    if (!marks) return [];
    let result = marks;
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter((m: any) =>
        m.students?.name?.toLowerCase().includes(term) ||
        m.students?.register_number?.toLowerCase().includes(term) ||
        m.subjects?.name?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [marks, debouncedSearch]);

  const totalStudents = students?.length ?? 0;
  const totalMarksEntries = marks?.length ?? 0;
  const presentMarks = marks?.filter((m: any) => !m.is_absent && m.marks_obtained != null) ?? [];
  const avgScore = presentMarks.length > 0
    ? Math.round(presentMarks.reduce((sum: number, m: any) => sum + (m.marks_obtained / m.max_marks) * 100, 0) / presentMarks.length)
    : 0;

  if (assignLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Coordinator Dashboard"
          description={assignedClass ? `Class: ${assignedClass.name} (Year ${assignedClass.year})` : 'No class assigned'}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard title="Students" value={totalStudents} icon={Users} color="gradient-primary" />
          <StatCard title="Mark Entries" value={totalMarksEntries} icon={BookOpen} color="bg-success" />
          <StatCard title="Avg Score" value={`${avgScore}%`} icon={BarChart3} color="bg-warning" />
        </div>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student or subject..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 rounded-xl h-11" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Student Marks</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <EmptyState message={marks?.length === 0 ? 'No marks recorded yet' : 'No results match your search'} />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header-blue">
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold">Reg. No</TableHead>
                      <TableHead className="font-semibold">Subject</TableHead>
                      <TableHead className="font-semibold">Exam</TableHead>
                      <TableHead className="font-semibold">Marks</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m: any) => {
                      const isAbsent = m.is_absent || m.marks_obtained == null;
                      const pct = isAbsent ? 0 : Math.round((m.marks_obtained / m.max_marks) * 100);
                      return (
                        <TableRow key={m.id} className="hover:bg-accent/50 transition-colors">
                          <TableCell className="font-medium">{m.students?.name}</TableCell>
                          <TableCell className="font-mono text-sm">{m.students?.register_number}</TableCell>
                          <TableCell>{m.subjects?.name}</TableCell>
                          <TableCell>{m.exams?.name}</TableCell>
                          <TableCell>{isAbsent ? 'AB' : `${m.marks_obtained}/${m.max_marks}`}</TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <Badge variant="outline" className="rounded-lg">Absent</Badge>
                            ) : (
                              <Badge variant={pct >= 40 ? 'default' : 'destructive'} className="rounded-lg">{pct >= 40 ? 'Pass' : 'Fail'}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
