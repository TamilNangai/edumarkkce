import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, BarChart3 } from 'lucide-react';
import { Search } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoordinatorDashboard() {
  const { user } = useAuthStore();
  const [selectedExam, setSelectedExam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get coordinator's assigned classes
  const { data: assignments, isLoading: assignLoading } = useQuery({
    queryKey: ['coordinator_assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select('*, subjects(*), classes(*)')
        .eq('teacher_id', user!.id);
      console.log('Coordinator assignments:', data, error);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Unique class IDs for this coordinator
  const classIds = useMemo(() => {
    const ids = new Set<string>();
    assignments?.forEach((a: any) => ids.add(a.class_id));
    return Array.from(ids);
  }, [assignments]);

  const assignedClass = assignments?.[0]?.classes;

  // Get students in assigned classes
  const { data: students } = useQuery({
    queryKey: ['coordinator_students', classIds],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .in('class_id', classIds)
        .order('name');
      console.log('Coordinator students:', data, error);
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  // Get exams
  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Get marks for assigned classes - filter by student class_id
  const { data: marks, isLoading: marksLoading } = useQuery({
    queryKey: ['coordinator_marks', classIds, selectedExam],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      // Get student IDs in assigned classes first
      const studentIds = (students || []).map((s: any) => s.id);
      if (studentIds.length === 0) return [];
      let query = supabase
        .from('marks')
        .select('*, students(*), subjects(*), exams(*)')
        .in('student_id', studentIds);
      if (selectedExam) query = query.eq('exam_id', selectedExam);
      const { data, error } = await query;
      console.log('Coordinator marks:', data, error);
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
  const avgScore = marks && marks.length > 0
    ? Math.round(marks.filter((m: any) => m.marks_obtained !== -1).reduce((sum: number, m: any) => sum + (m.marks_obtained / m.max_marks) * 100, 0) / marks.filter((m: any) => m.marks_obtained !== -1).length)
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Coordinator Dashboard</h1>
          <p className="text-muted-foreground">
            {assignedClass ? `Class: ${assignedClass.name} (Year ${assignedClass.year})` : 'No class assigned'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Students" value={totalStudents} icon={Users} color="gradient-primary" />
          <StatCard title="Mark Entries" value={totalMarksEntries} icon={BookOpen} color="bg-success" />
          <StatCard title="Avg Score" value={`${avgScore}%`} icon={BarChart3} color="bg-warning" />
        </div>

        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student or subject..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Student Marks</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {marks?.length === 0 ? 'No marks recorded yet for your class.' : 'No results match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Reg. No</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m: any) => {
                      const isAbsent = m.marks_obtained === -1;
                      const pct = isAbsent ? 0 : Math.round((m.marks_obtained / m.max_marks) * 100);
                      return (
                        <TableRow key={m.id}>
                          <TableCell>{m.students?.name}</TableCell>
                          <TableCell className="font-mono">{m.students?.register_number}</TableCell>
                          <TableCell>{m.subjects?.name}</TableCell>
                          <TableCell>{m.exams?.name}</TableCell>
                          <TableCell>{isAbsent ? 'AB' : `${m.marks_obtained}/${m.max_marks}`}</TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <Badge variant="outline">Absent</Badge>
                            ) : (
                              <Badge variant={pct >= 40 ? 'default' : 'destructive'}>
                                {pct >= 40 ? 'Pass' : 'Fail'}
                              </Badge>
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
