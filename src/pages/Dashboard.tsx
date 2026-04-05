import { useAuthStore } from '@/store/useAuthStore';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useTeacherSubjects, useMarks, useDepartments, useClasses } from '@/hooks/useMarksData';
import { Users, BookOpen, Building2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { role } = useAuthStore();
  const { data: teacherSubjects } = useTeacherSubjects();
  const { data: marks } = useMarks();
  const { data: departments } = useDepartments();
  const { data: classes } = useClasses();

  const presentMarks = marks?.filter((m: any) => !m.is_absent && m.marks_obtained != null) ?? [];
  const totalMarks = presentMarks.length;
  const avgMarks = totalMarks > 0
    ? Math.round(presentMarks.reduce((sum: number, m: any) => sum + (m.marks_obtained / m.max_marks) * 100, 0) / totalMarks)
    : 0;
  const passCount = presentMarks.filter((m: any) => (m.marks_obtained / m.max_marks) * 100 >= 40).length;
  const passPercentage = totalMarks > 0 ? Math.round((passCount / totalMarks) * 100) : 0;

  const subjectMap = new Map<string, { name: string; total: number; count: number }>();
  presentMarks.forEach((m: any) => {
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
      <div className="space-y-8">
        <PageHeader title="Dashboard" description="Welcome back! Here's an overview of your institution." />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Total Entries" value={totalMarks} icon={BookOpen} color="gradient-primary" />
          <StatCard title="Avg Score" value={`${avgMarks}%`} icon={BarChart3} color="bg-success" />
          <StatCard title="Pass Rate" value={`${passPercentage}%`} icon={Users} color="bg-warning" />
          <StatCard
            title={role === 'principal' ? 'Departments' : 'Subjects'}
            value={role === 'principal' ? (departments?.length ?? 0) : (teacherSubjects?.length ?? 0)}
            icon={Building2}
            color="bg-destructive"
          />
        </div>

        {chartData.length > 0 ? (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Subject-wise Average Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Bar dataKey="average" fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent>
              <EmptyState message="No performance data yet" description="Marks data will appear here once entered." />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
