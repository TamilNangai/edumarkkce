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

  // Auto-set department for HOD
  useEffect(() => {
    if (role === 'hod' && profile?.department_id) {
      setSelectedDept(profile.department_id);
    }
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
    let result = selectedDept
      ? marks?.filter((m: any) => deptSubjectIds.has(m.subject_id)) ?? []
      : marks ?? [];
    if (selectedClass) {
      result = result.filter((m: any) => m.students?.class_id === selectedClass);
    }
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

  // Subject-wise report
  const subjectMap = new Map<string, { name: string; total: number; count: number; pass: number; fail: number }>();
  filteredMarks.forEach((m: any) => {
    if (m.is_absent || m.marks_obtained == null) return;
    const name = m.subjects?.name ?? 'Unknown';
    const existing = subjectMap.get(name) || { name, total: 0, count: 0, pass: 0, fail: 0 };
    const pct = (m.marks_obtained / m.max_marks) * 100;
    existing.total += pct;
    existing.count += 1;
    if (pct >= 40) existing.pass += 1;
    else existing.fail += 1;
    subjectMap.set(name, existing);
  });
  const subjectReportData = Array.from(subjectMap.values()).map(s => ({
    name: s.name,
    average: Math.round(s.total / s.count),
    passRate: s.count > 0 ? Math.round((s.pass / s.count) * 100) : 0,
    pass: s.pass,
    fail: s.fail,
    total: s.count,
  }));

  // Consolidated report
  const consolidatedData = useMemo(() => {
    if (!selectedClass || !classStudents || !subjects) return [];
    return classStudents.map((student: any) => {
      const subjectMarks = subjects.map((sub: any) => {
        const mark = filteredMarks.find(
          (m: any) => m.student_id === student.id && m.subject_id === sub.id
        );
        return {
          subjectName: sub.name,
          obtained: mark && !mark.is_absent ? mark.marks_obtained : null,
          max: mark ? mark.max_marks : null,
          absent: mark?.is_absent ?? false,
        };
      });
      const validMarks = subjectMarks.filter(sm => sm.obtained !== null && !sm.absent);
      const totalObtained = validMarks.reduce((s, m) => s + (m.obtained ?? 0), 0);
      const totalMax = validMarks.reduce((s, m) => s + (m.max ?? 0), 0);
      return {
        student,
        subjectMarks,
        totalObtained,
        totalMax,
        percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0,
      };
    });
  }, [selectedClass, classStudents, subjects, filteredMarks]);

  const reportData = filteredMarks
    .filter((m: any) => !m.is_absent && m.marks_obtained != null)
    .map((m: any) => ({
      studentName: m.students?.name ?? '',
      regNo: m.students?.register_number ?? '',
      subject: m.subjects?.name ?? '',
      obtained: m.marks_obtained,
      max: m.max_marks,
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

  const showDeptFilter = role === 'principal';
  const showClassFilter = role !== 'coordinator';

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
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {showDeptFilter && (
              <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedClass(''); }}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showClassFilter && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  {classes?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {marksLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : (
          <Tabs defaultValue="subject-wise">
            <TabsList>
              <TabsTrigger value="subject-wise">Subject-wise</TabsTrigger>
              <TabsTrigger value="consolidated">Consolidated</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
            </TabsList>

            <TabsContent value="subject-wise" className="space-y-4 mt-4">
              {subjectReportData.length > 0 ? (
                <>
                  <Card>
                    <CardHeader><CardTitle>Subject Performance</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={subjectReportData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="average" fill="hsl(217,91%,60%)" name="Average %" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="passRate" fill="hsl(142,71%,45%)" name="Pass Rate %" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Average</TableHead>
                            <TableHead>Pass</TableHead>
                            <TableHead>Fail</TableHead>
                            <TableHead>Pass Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjectReportData.map((s) => (
                            <TableRow key={s.name}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>{s.total}</TableCell>
                              <TableCell>{s.average}%</TableCell>
                              <TableCell>{s.pass}</TableCell>
                              <TableCell>{s.fail}</TableCell>
                              <TableCell>
                                <Badge variant={s.passRate >= 60 ? 'default' : 'destructive'}>{s.passRate}%</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No data available. Select filters above.</CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="consolidated" className="mt-4">
              {!selectedClass ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Please select a class to view the consolidated report.</CardContent></Card>
              ) : consolidatedData.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No students found.</CardContent></Card>
              ) : (
                <Card>
                  <CardHeader><CardTitle>Consolidated Report</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reg No</TableHead>
                            <TableHead>Name</TableHead>
                            {subjects?.map((sub: any) => (
                              <TableHead key={sub.id} className="text-center">{sub.name}</TableHead>
                            ))}
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">%</TableHead>
                            <TableHead>Result</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {consolidatedData.map((row: any) => (
                            <TableRow key={row.student.id}>
                              <TableCell className="font-mono">{row.student.register_number}</TableCell>
                              <TableCell>{row.student.name}</TableCell>
                              {row.subjectMarks.map((sm: any, i: number) => (
                                <TableCell key={i} className="text-center">
                                  {sm.absent ? (
                                    <Badge variant="outline">AB</Badge>
                                  ) : sm.obtained !== null ? (
                                    <span className={sm.max && (sm.obtained / sm.max) * 100 < 40 ? 'text-destructive font-medium' : ''}>
                                      {sm.obtained}/{sm.max}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              ))}
                              <TableCell className="text-center font-medium">{row.totalObtained}/{row.totalMax}</TableCell>
                              <TableCell className="text-center">{row.percentage}%</TableCell>
                              <TableCell>
                                <Badge variant={row.percentage >= 40 ? 'default' : 'destructive'}>
                                  {row.percentage >= 40 ? 'Pass' : 'Fail'}
                                </Badge>
                              </TableCell>
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
                            const isAbsent = m.is_absent || m.marks_obtained == null;
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
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No results found. Adjust your filters.</CardContent></Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
