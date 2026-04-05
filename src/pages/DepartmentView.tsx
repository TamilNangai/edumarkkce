import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDepartments, useClasses, useMarks, useSubjects } from '@/hooks/useMarksData';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(217,91%,60%)', 'hsl(0,84%,60%)'];

export default function DepartmentView() {
  const { profile, role } = useAuthStore();
  const { data: departments } = useDepartments();
  const [selectedDept, setSelectedDept] = useState(profile?.department_id ?? '');
  const { data: classes } = useClasses(selectedDept || undefined);
  const { data: subjects } = useSubjects(selectedDept || undefined);
  const { data: marks } = useMarks();

  const deptSubjectIds = new Set(subjects?.map((s: any) => s.id) ?? []);
  const deptMarks = marks?.filter((m: any) => deptSubjectIds.has(m.subject_id) && !m.is_absent && m.marks_obtained != null) ?? [];

  const classMap = new Map<string, { name: string; total: number; count: number; pass: number }>();
  deptMarks.forEach((m: any) => {
    const cls = classes?.find((c: any) => c.id === m.students?.class_id);
    if (!cls) return;
    const existing = classMap.get(cls.id) || { name: cls.name, total: 0, count: 0, pass: 0 };
    const pct = (m.marks_obtained / m.max_marks) * 100;
    existing.total += pct;
    existing.count += 1;
    if (pct >= 40) existing.pass += 1;
    classMap.set(cls.id, existing);
  });

  const classChartData = Array.from(classMap.values()).map(c => ({
    name: c.name,
    average: Math.round(c.total / c.count),
    passRate: Math.round((c.pass / c.count) * 100),
  }));

  const totalPass = deptMarks.filter((m: any) => (m.marks_obtained / m.max_marks) * 100 >= 40).length;
  const totalFail = deptMarks.length - totalPass;
  const pieData = [
    { name: 'Pass', value: totalPass },
    { name: 'Fail', value: totalFail },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader title="Department View" description="Analyze department-level performance" />

        {role === 'principal' && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="pt-6">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {classChartData.length > 0 || deptMarks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {classChartData.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader><CardTitle className="text-lg">Class-wise Average</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={classChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                      <Bar dataKey="average" fill="hsl(217,91%,60%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {deptMarks.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader><CardTitle className="text-lg">Pass vs Fail</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={110} innerRadius={60} dataKey="value" label paddingAngle={2}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent>
              <EmptyState message="No data available" description="Select a department to view performance analytics." />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
