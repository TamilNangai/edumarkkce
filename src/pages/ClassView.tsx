import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useClasses, useMarks, useExams } from '@/hooks/useMarksData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

  const { data: marks } = useMarks({
    class_id: selectedClass || undefined,
    exam_id: selectedExam || undefined,
  });

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
        <h1 className="text-2xl font-bold">Class View</h1>
        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                {classes?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} (Year {c.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Student Marks</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No results found. Try adjusting your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Reg. No</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Percentage</TableHead>
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
                          <TableCell>{isAbsent ? 'AB' : `${m.marks_obtained}/${m.max_marks}`}</TableCell>
                          <TableCell>{isAbsent ? '—' : `${pct}%`}</TableCell>
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
