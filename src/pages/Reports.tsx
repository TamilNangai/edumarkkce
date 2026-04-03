import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useMarks, useDepartments, useClasses, useSubjects, useExams } from '@/hooks/useMarksData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { generateMarksPDF, generateCSV } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Reports() {
  const { data: departments } = useDepartments();
  const { data: exams } = useExams();
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedExam, setSelectedExam] = useState('');

  const { data: classes } = useClasses(selectedDept || undefined);
  const { data: subjects } = useSubjects(selectedDept || undefined);
  const { data: marks } = useMarks({ exam_id: selectedExam || undefined });

  // Filter by department
  const deptSubjectIds = new Set(subjects?.map((s: any) => s.id) ?? []);
  const filteredMarks = selectedDept
    ? marks?.filter((m: any) => deptSubjectIds.has(m.subject_id)) ?? []
    : marks ?? [];

  const reportData = filteredMarks.map((m: any) => ({
    studentName: m.students?.name ?? '',
    regNo: m.students?.register_number ?? '',
    subject: m.subjects?.name ?? '',
    obtained: m.marks_obtained,
    max: m.max_marks,
  }));

  // Subject chart
  const subjectMap = new Map<string, { name: string; total: number; count: number }>();
  filteredMarks.forEach((m: any) => {
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

  const handlePDF = () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    const doc = generateMarksPDF('Exam Report', reportData);
    doc.save('exam-report.pdf');
    toast.success('PDF downloaded');
  };

  const handleCSV = () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    const csv = generateCSV(reportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'exam-report.csv');
    toast.success('CSV downloaded');
  };

  const handleZIP = async () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    const zip = new JSZip();
    const doc = generateMarksPDF('Exam Report', reportData);
    zip.file('exam-report.pdf', doc.output('blob'));
    zip.file('exam-report.csv', generateCSV(reportData));
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'exam-reports.zip');
    toast.success('ZIP downloaded');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Reports</h1>
          <div className="flex gap-2">
            <Button onClick={handlePDF} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button onClick={handleCSV} variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button onClick={handleZIP} size="sm" className="gradient-primary">
              <Download className="h-4 w-4 mr-1" /> ZIP
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                {departments?.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {chartData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Subject Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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

        {filteredMarks.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Marks Data ({filteredMarks.length} entries)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Reg No</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMarks.map((m: any) => {
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
