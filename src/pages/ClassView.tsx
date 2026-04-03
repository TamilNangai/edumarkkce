import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useClasses, useMarks, useSubjects, useExams } from '@/hooks/useMarksData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ClassView() {
  const { data: classes } = useClasses();
  const { data: exams } = useExams();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');

  const { data: marks } = useMarks({
    class_id: selectedClass || undefined,
    exam_id: selectedExam || undefined,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Class View</h1>
        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </CardContent>
        </Card>

        {marks && marks.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Student Marks</CardTitle></CardHeader>
            <CardContent>
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
                  {marks.map((m: any) => {
                    const pct = Math.round((m.marks_obtained / m.max_marks) * 100);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>{m.students?.name}</TableCell>
                        <TableCell className="font-mono">{m.students?.register_number}</TableCell>
                        <TableCell>{m.subjects?.name}</TableCell>
                        <TableCell>{m.marks_obtained}/{m.max_marks}</TableCell>
                        <TableCell>{pct}%</TableCell>
                        <TableCell>
                          <Badge variant={pct >= 40 ? 'default' : 'destructive'}>
                            {pct >= 40 ? 'Pass' : 'Fail'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
