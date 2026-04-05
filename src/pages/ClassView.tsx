import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useClasses, useMarks, useExams } from '@/hooks/useMarksData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Search } from 'lucide-react';

export default function ClassView() {
  const { data: classes } = useClasses();
  const { data: exams } = useExams();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: marks } = useMarks({ class_id: selectedClass || undefined, exam_id: selectedExam || undefined });

  const filtered = useMemo(() => {
    if (!marks) return [];
    if (!debouncedSearch) return marks;
    const term = debouncedSearch.toLowerCase();
    return marks.filter((m: any) =>
      m.students?.name?.toLowerCase().includes(term) ||
      m.students?.register_number?.toLowerCase().includes(term) ||
      m.subjects?.name?.toLowerCase().includes(term)
    );
  }, [marks, debouncedSearch]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Class View" description="View marks by class and exam" />

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                {classes?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} (Year {c.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 rounded-xl h-11" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Student Marks</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <EmptyState message="No results found" description="Try adjusting your filters." />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header-blue">
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold">Reg. No</TableHead>
                      <TableHead className="font-semibold">Subject</TableHead>
                      <TableHead className="font-semibold">Marks</TableHead>
                      <TableHead className="font-semibold">Percentage</TableHead>
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
                          <TableCell>{isAbsent ? 'AB' : `${m.marks_obtained}/${m.max_marks}`}</TableCell>
                          <TableCell>{isAbsent ? '—' : `${pct}%`}</TableCell>
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
