import { useAuthStore } from '@/store/useAuthStore';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeacherSubjects, useMarks, useDepartments, useClasses } from '@/hooks/useMarksData';
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

export default function Dashboard() {
  const { role } = useAuthStore();
  const { data: teacherSubjects } = useTeacherSubjects();
  const { data: marks } = useMarks();
  const { data: departments } = useDepartments();
  const { data: classes } = useClasses();

  const totalMarks = marks?.length ?? 0;
  const avgMarks = marks && marks.length > 0
    ? Math.round(marks.reduce((sum: number, m: any) => sum + (m.marks_obtained / m.max_marks) * 100, 0) / marks.length)
    : 0;
  const passCount = marks?.filter((m: any) => (m.marks_obtained / m.max_marks) * 100 >= 40).length ?? 0;
  const passPercentage = totalMarks > 0 ? Math.round((passCount / totalMarks) * 100) : 0;

  // Chart data - group by subject
  const subjectMap = new Map<string, { name: string; total: number; count: number }>();
  marks?.forEach((m: any) => {
    const name = m.subjects?.name ?? 'Unknown';
    const existing = subjectMap.get(name) || { name, total: 0, count: 0 };
    existing.total += (m.marks_obtained / m.max_marks) * 100;
    existing.count += 1;
    subjectMap.set(name, existing);
  });
  const chartData = Array.from(subjectMap.values()).map(s => ({
    name: s.name,
    average: Math.round(s.total / s.count),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Entries" value={totalMarks} icon={BookOpen} color="gradient-primary" />
          <StatCard title="Avg Score" value={`${avgMarks}%`} icon={BarChart3} color="bg-success" />
          <StatCard title="Pass Rate" value={`${passPercentage}%`} icon={Users} color="bg-warning" />
          <StatCard title={role === 'principal' ? 'Departments' : 'Subjects'}
            value={role === 'principal' ? (departments?.length ?? 0) : (teacherSubjects?.length ?? 0)}
            icon={Building2} color="bg-destructive" />
        </div>

        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Average Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
