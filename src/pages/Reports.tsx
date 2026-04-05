import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useMarks, useDepartments, useClasses, useSubjects, useExams, useStudentsByClass } from '@/hooks/useMarksData';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { generateMarksPDF, generateCSV } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import { Download, FileText, FileSpreadsheet, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Reports() {
  const { role, profile } = useAuthStore();
  const { data: departments } = useDepartments();
  const { data: exams } = useExams();
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (role === 'hod' && profile?.department_id) setSelectedDept(profile.department_id);
  }, [role, profile]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: classes } = useClasses(selectedDept || undefined);
  const { data: subjects } = useSubjects(selectedDept || undefined);
  const { data: marks, isLoading: marksLoading } = useMarks({ exam_id: selectedExam || undefined });
  const { data: classStudents } = useStudentsByClass(selectedClass || null);

  const deptSubjectIds = new Set(subjects?.map((s: any) => s.id) ?? []);
  const filteredMarks = useMemo(() => {
    let result = selectedDept ? marks?.filter((m: any) => deptSubjectIds.has(m.subject_id)) ?? [] : marks ?? [];
    if (selectedClass) result = result.filter((m: any) => m.students?.class_id === selectedClass);
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter((m: any) =>
        m.students?.name?.toLowerCase().includes(term) ||
        m.students?.register_number?.toLowerCase().includes(term) ||
        m.subjects?.name?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [marks, selectedDept, selectedClass, debouncedSearch, deptSubjectIds]);

  const subjectMap = new Map<string, { name: string; total: number; count: number; pass: number; fail: number }>();
  filteredMarks.forEach((m: any) => {
    if (m.is_absent || m.marks_obtained == null) return;
    const name = m.subjects?.name ?? 'Unknown';
    const existing = subjectMap.get(name) || { name, total: 0, count: 0, pass: 0, fail: 0 };
    const pct = (m.marks_obtained / m.max_marks) * 100;
    existing.total += pct;
    existing.count += 1;
    if (pct >= 40) existing.pass += 1; else existing.fail += 1;
    subjectMap.set(name, existing);
  });
  const subjectReportData = Array.from(subjectMap.values()).map(s => ({
    name: s.name, average: Math.round(s.total / s.count),
    passRate: s.count > 0 ? Math.round((s.pass / s.count) * 100) : 0,
    pass: s.pass, fail: s.fail, total: s.count,
  }));

  const consolidatedData = useMemo(() => {
    if (!selectedClass || !classStudents || !subjects) return [];
    return classStudents.map((student: any) => {
      const subjectMarks = subjects.map((sub: any) => {
        const mark = filteredMarks.find((m: any) => m.student_id === student.id && m.subject_id === sub.id);
        return { subjectName: sub.name, obtained: mark && !mark.is_absent ? mark.marks_obtained : null, max: mark ? mark.max_marks : null, absent: mark?.is_absent ?? false };
      });
      const validMarks = subjectMarks.filter(sm => sm.obtained !== null && !sm.absent);
      const totalObtained = validMarks.reduce((s, m) => s + (m.obtained ?? 0), 0);
      const totalMax = validMarks.reduce((s, m) => s + (m.max ?? 0), 0);
      return { student, subjectMarks, totalObtained, totalMax, percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0 };
    });
  }, [selectedClass, classStudents, subjects, filteredMarks]);

  const reportData = filteredMarks
    .filter((m: any) => !m.is_absent && m.marks_obtained != null)
    .map((m: any) => ({ studentName: m.students?.name ?? '', regNo: m.students?.register_number ?? '', subject: m.subjects?.name ?? '', obtained: m.marks_obtained, max: m.max_marks }));

  const handlePDF = () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    generateMarksPDF('Exam Report', reportData).save('exam-report.pdf');
    toast.success('PDF downloaded');
  };

  const handleCSV = () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    saveAs(new Blob([generateCSV(reportData)], { type: 'text/csv;charset=utf-8;' }), 'exam-report.csv');
    toast.success('CSV downloaded');
  };

  const handleZIP = async () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    const zip = new JSZip();
    zip.file('exam-report.pdf', generateMarksPDF('Exam Report', reportData).output('blob'));
    zip.file('exam-report.csv', generateCSV(reportData));
    saveAs(await zip.generateAsync({ type: 'blob' }), 'exam-reports.zip');
    toast.success('ZIP downloaded');
  };

  const showDeptFilter = role === 'principal';
  const showClassFilter = role !== 'coordinator';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="View and export exam reports"
          actions={
            <div className="flex gap-2">
              <Button onClick={handlePDF} variant="outline" size="sm" className="rounded-xl">
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button onClick={handleCSV} variant="outline" size="sm" className="rounded-xl">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button onClick={handleZIP} size="sm" className="gradient-primary rounded-xl shadow-md shadow-primary/20">
                <Download className="h-4 w-4 mr-1" /> ZIP
              </Button>
            </div>
          }
        />

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {showDeptFilter && (
              <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedClass(''); }}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>{departments?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>{exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            {showClassFilter && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>{classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 rounded-xl h-11" />
            </div>
          </CardContent>
        </Card>

        {marksLoading ? (
          <Card className="rounded-2xl border-0 shadow-md"><CardContent className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></CardContent></Card>
        ) : (
          <Tabs defaultValue="subject-wise">
            <TabsList className="rounded-xl h-11 p-1">
              <TabsTrigger value="subject-wise" className="rounded-lg">Subject-wise</TabsTrigger>
              <TabsTrigger value="consolidated" className="rounded-lg">Consolidated</TabsTrigger>
              <TabsTrigger value="detailed" className="rounded-lg">Detailed</TabsTrigger>
            </TabsList>

            <TabsContent value="subject-wise" className="space-y-4 mt-4">
              {subjectReportData.length > 0 ? (
                <>
                  <Card className="rounded-2xl border-0 shadow-md">
                    <CardHeader><CardTitle className="text-lg">Subject Performance</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={subjectReportData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Bar dataKey="average" fill="hsl(217,91%,60%)" name="Average %" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="passRate" fill="hsl(142,71%,45%)" name="Pass Rate %" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-0 shadow-md">
                    <CardContent className="pt-6">
                      <div className="overflow-x-auto rounded-xl border">
                        <Table>
                          <TableHeader>
                            <TableRow className="table-header-blue">
                              <TableHead className="font-semibold">Subject</TableHead>
                              <TableHead className="font-semibold">Students</TableHead>
                              <TableHead className="font-semibold">Average</TableHead>
                              <TableHead className="font-semibold">Pass</TableHead>
                              <TableHead className="font-semibold">Fail</TableHead>
                              <TableHead className="font-semibold">Pass Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subjectReportData.map((s) => (
                              <TableRow key={s.name} className="hover:bg-accent/50 transition-colors">
                                <TableCell className="font-medium">{s.name}</TableCell>
                                <TableCell>{s.total}</TableCell>
                                <TableCell>{s.average}%</TableCell>
                                <TableCell>{s.pass}</TableCell>
                                <TableCell>{s.fail}</TableCell>
                                <TableCell><Badge variant={s.passRate >= 60 ? 'default' : 'destructive'} className="rounded-lg">{s.passRate}%</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="rounded-2xl border-0 shadow-md"><CardContent><EmptyState message="No data available" description="Select filters above to view subject reports." /></CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="consolidated" className="mt-4">
              {!selectedClass ? (
                <Card className="rounded-2xl border-0 shadow-md"><CardContent><EmptyState message="Select a class" description="Please select a class to view the consolidated report." /></CardContent></Card>
              ) : consolidatedData.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-md"><CardContent><EmptyState message="No students found" /></CardContent></Card>
              ) : (
                <Card className="rounded-2xl border-0 shadow-md">
                  <CardHeader><CardTitle className="text-lg">Consolidated Report</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-xl border">
                      <Table>
                        <TableHeader>
                          <TableRow className="table-header-blue">
                            <TableHead className="font-semibold">Reg No</TableHead>
                            <TableHead className="font-semibold">Name</TableHead>
                            {subjects?.map((sub: any) => <TableHead key={sub.id} className="text-center font-semibold">{sub.name}</TableHead>)}
                            <TableHead className="text-center font-semibold">Total</TableHead>
                            <TableHead className="text-center font-semibold">%</TableHead>
                            <TableHead className="font-semibold">Result</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {consolidatedData.map((row: any) => (
                            <TableRow key={row.student.id} className="hover:bg-accent/50 transition-colors">
                              <TableCell className="font-mono text-sm">{row.student.register_number}</TableCell>
                              <TableCell className="font-medium">{row.student.name}</TableCell>
                              {row.subjectMarks.map((sm: any, i: number) => (
                                <TableCell key={i} className="text-center">
                                  {sm.absent ? <Badge variant="outline" className="rounded-lg">AB</Badge>
                                    : sm.obtained !== null ? <span className={sm.max && (sm.obtained / sm.max) * 100 < 40 ? 'text-destructive font-medium' : ''}>{sm.obtained}/{sm.max}</span>
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              ))}
                              <TableCell className="text-center font-semibold">{row.totalObtained}/{row.totalMax}</TableCell>
                              <TableCell className="text-center">{row.percentage}%</TableCell>
                              <TableCell><Badge variant={row.percentage >= 40 ? 'default' : 'destructive'} className="rounded-lg">{row.percentage >= 40 ? 'Pass' : 'Fail'}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="detailed" className="mt-4">
              {filteredMarks.length > 0 ? (
                <Card className="rounded-2xl border-0 shadow-md">
                  <CardHeader><CardTitle className="text-lg">Marks Data ({filteredMarks.length} entries)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-xl border">
                      <Table>
                        <TableHeader>
                          <TableRow className="table-header-blue">
                            <TableHead className="font-semibold">Student</TableHead>
                            <TableHead className="font-semibold">Reg No</TableHead>
                            <TableHead className="font-semibold">Subject</TableHead>
                            <TableHead className="font-semibold">Marks</TableHead>
                            <TableHead className="font-semibold">%</TableHead>
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
                                <TableCell>{isAbsent ? 'AB' : `${m.marks_obtained}/${m.max_marks}`}</TableCell>
                                <TableCell>{isAbsent ? '—' : `${pct}%`}</TableCell>
                                <TableCell>
                                  {isAbsent ? <Badge variant="outline" className="rounded-lg">Absent</Badge>
                                    : <Badge variant={pct >= 40 ? 'default' : 'destructive'} className="rounded-lg">{pct >= 40 ? 'Pass' : 'Fail'}</Badge>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl border-0 shadow-md"><CardContent><EmptyState message="No results found" description="Adjust your filters." /></CardContent></Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
