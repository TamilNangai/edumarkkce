import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Building2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

export default function HodDashboard() {
  const { profile } = useAuthStore();
  const deptId = profile?.department_id;
  const [selectedClass, setSelectedClass] = useState('');

  // Department info
  const { data: department } = useQuery({
    queryKey: ['department', deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', deptId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  // Classes in department
  const { data: classes } = useQuery({
    queryKey: ['dept_classes', deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('department_id', deptId!)
        .order('name');
      console.log('HOD classes:', data, error);
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  // Subjects in department
  const { data: subjects } = useQuery({
    queryKey: ['dept_subjects', deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('department_id', deptId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  // Students in department (via classes)
  const classIds = useMemo(() => classes?.map((c: any) => c.id) ?? [], [classes]);

  const { data: students } = useQuery({
    queryKey: ['dept_students', classIds],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .in('class_id', classIds)
        .order('name');
      console.log('HOD students:', data, error);
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  // Marks in department
  const { data: marks } = useQuery({
    queryKey: ['dept_marks', deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marks')
        .select('*, students(*), subjects(*), exams(*)');
      console.log('HOD marks:', data, error);
      if (error) throw error;
      return data;
    },
    enabled: !!deptId,
  });

  // Filter marks by selected class
  const filteredMarks = useMemo(() => {
    if (!marks) return [];
    if (!selectedClass) return marks;
    return marks.filter((m: any) => m.students?.class_id === selectedClass);
  }, [marks, selectedClass]);

  // Chart data by subject
  const subjectChart = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    (marks ?? []).filter((m: any) => m.marks_obtained !== -1).forEach((m: any) => {
      const name = m.subjects?.name ?? 'Unknown';
      const existing = map.get(name) || { name, total: 0, count: 0 };
      existing.total += (m.marks_obtained / m.max_marks) * 100;
      existing.count += 1;
      map.set(name, existing);
    });
    return Array.from(map.values()).map(s => ({
      name: s.name,
      average: Math.round(s.total / s.count),
    }));
  }, [marks]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">HOD Dashboard</h1>
          <p className="text-muted-foreground">
            {department ? `Department: ${department.name}` : 'No department assigned'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Classes" value={classes?.length ?? 0} icon={Building2} color="gradient-primary" />
          <StatCard title="Students" value={students?.length ?? 0} icon={Users} color="bg-success" />
          <StatCard title="Subjects" value={subjects?.length ?? 0} icon={BookOpen} color="bg-warning" />
          <StatCard title="Mark Entries" value={marks?.length ?? 0} icon={BarChart3} color="bg-destructive" />
        </div>

        {subjectChart.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Subject-wise Average</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle>Student Marks</CardTitle>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Classes" /></SelectTrigger>
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
              <div className="py-8 text-center text-muted-foreground">
                No marks recorded yet for your department.
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
                    {filteredMarks.map((m: any) => {
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
