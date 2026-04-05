import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Building2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function HodDashboard() {
  const { profile } = useAuthStore();
  const deptId = profile?.department_id;
  const [selectedClass, setSelectedClass] = useState('');

  const { data: department } = useQuery({
    queryKey: ['department', deptId],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('id', deptId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  const { data: classes } = useQuery({
    queryKey: ['dept_classes', deptId],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').eq('department_id', deptId!).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  const { data: subjects } = useQuery({
    queryKey: ['dept_subjects', deptId],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').eq('department_id', deptId!).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  const classIds = useMemo(() => classes?.map((c: any) => c.id) ?? [], [classes]);

  const { data: students } = useQuery({
    queryKey: ['dept_students', classIds],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const { data, error } = await supabase.from('students').select('*').in('class_id', classIds).order('name');
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  const { data: marks } = useQuery({
    queryKey: ['dept_marks', deptId],
    queryFn: async () => {
      const { data, error } = await supabase.from('marks').select('*, students(*), subjects(*), exams(*)');
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  const filteredMarks = useMemo(() => {
    if (!marks) return [];
    if (!selectedClass || selectedClass === 'all') return marks;
    return marks.filter((m: any) => m.students?.class_id === selectedClass);
  }, [marks, selectedClass]);

  const subjectChart = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    (marks ?? []).filter((m: any) => !m.is_absent && m.marks_obtained != null).forEach((m: any) => {
      const name = m.subjects?.name ?? 'Unknown';
      const existing = map.get(name) || { name, total: 0, count: 0 };
      existing.total += (m.marks_obtained / m.max_marks) * 100;
      existing.count += 1;
      map.set(name, existing);
    });
    return Array.from(map.values()).map(s => ({ name: s.name, average: Math.round(s.total / s.count) }));
  }, [marks]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="HOD Dashboard"
          description={department ? `Department: ${department.name}` : 'No department assigned'}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Classes" value={classes?.length ?? 0} icon={Building2} color="gradient-primary" />
          <StatCard title="Students" value={students?.length ?? 0} icon={Users} color="bg-success" />
          <StatCard title="Subjects" value={subjects?.length ?? 0} icon={BookOpen} color="bg-warning" />
          <StatCard title="Mark Entries" value={marks?.length ?? 0} icon={BarChart3} color="bg-destructive" />
        </div>

        {subjectChart.length > 0 && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader><CardTitle className="text-lg">Subject-wise Average</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={subjectChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="average" fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Student Marks</CardTitle>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48 rounded-xl h-11"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filteredMarks.length === 0 ? (
              <EmptyState message="No marks recorded yet" description="Marks for your department will appear here." />
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
                    {filteredMarks.map((m: any) => {
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
