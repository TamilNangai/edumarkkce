import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDepartments, useClasses, useMarks, useSubjects } from '@/hooks/useMarksData';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(217,91%,60%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)', 'hsl(262,83%,58%)'];

export default function DepartmentView() {
  const { profile, role } = useAuthStore();
  const { data: departments } = useDepartments();
  const [selectedDept, setSelectedDept] = useState(profile?.department_id ?? '');
  const { data: classes } = useClasses(selectedDept || undefined);
  const { data: subjects } = useSubjects(selectedDept || undefined);
  const { data: marks } = useMarks();

  // Filter marks by department subjects
  const deptSubjectIds = new Set(subjects?.map((s: any) => s.id) ?? []);
  const deptMarks = marks?.filter((m: any) => deptSubjectIds.has(m.subject_id)) ?? [];

  // Class performance
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

  // Pass/Fail pie
  const totalPass = deptMarks.filter((m: any) => (m.marks_obtained / m.max_marks) * 100 >= 40).length;
  const totalFail = deptMarks.length - totalPass;
  const pieData = [
    { name: 'Pass', value: totalPass },
    { name: 'Fail', value: totalFail },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Department View</h1>

        {role === 'principal' && (
          <Card>
            <CardContent className="pt-6">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classChartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Class-wise Average</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="average" fill="hsl(217,91%,60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {deptMarks.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Pass vs Fail</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
