import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTeacherSubjects, useStudentsByClass, useExams, useMarks } from '@/hooks/useMarksData';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Save, BookOpen, GraduationCap } from 'lucide-react';

export default function MarksEntry() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: teacherSubjects, isLoading: tsLoading } = useTeacherSubjects();
  const { data: exams } = useExams();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [absentMap, setAbsentMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const assignedClasses = useMemo(() => {
    if (!teacherSubjects) return [];
    const classMap = new Map<string, { id: string; name: string }>();
    teacherSubjects.forEach((ts: any) => {
      if (ts.classes && !classMap.has(ts.class_id)) {
        classMap.set(ts.class_id, { id: ts.class_id, name: ts.classes.name });
      }
    });
    return Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherSubjects]);

  const assignedSubjects = useMemo(() => {
    if (!teacherSubjects || !selectedClassId) return [];
    return teacherSubjects
      .filter((ts: any) => ts.class_id === selectedClassId && ts.subjects)
      .map((ts: any) => ({ id: ts.subject_id, name: ts.subjects.name }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [teacherSubjects, selectedClassId]);

  const { data: students, isLoading: studentsLoading } = useStudentsByClass(selectedClassId || null);
  const { data: existingMarks } = useMarks({
    subject_id: selectedSubjectId || undefined,
    exam_id: selectedExam || undefined,
    class_id: selectedClassId || undefined,
  });

  useEffect(() => {
    setSelectedSubjectId('');
    setSelectedExam('');
    setMarksMap({});
    setAbsentMap({});
  }, [selectedClassId]);

  useEffect(() => {
    setMarksMap({});
    setAbsentMap({});
  }, [selectedSubjectId, selectedExam]);

  useEffect(() => {
    if (existingMarks && existingMarks.length > 0 && selectedSubjectId && selectedExam) {
      const newMap: Record<string, string> = {};
      const newAbsent: Record<string, boolean> = {};
      existingMarks.forEach((m: any) => {
        if (m.is_absent) {
          newAbsent[m.student_id] = true;
          newMap[m.student_id] = '';
        } else {
          newMap[m.student_id] = m.marks_obtained != null ? String(m.marks_obtained) : '';
        }
      });
      setMarksMap(newMap);
      setAbsentMap(newAbsent);
    }
  }, [existingMarks, selectedSubjectId, selectedExam]);

  const allSelected = selectedClassId && selectedSubjectId && selectedExam;

  const handleSave = async () => {
    if (!selectedSubjectId || !selectedExam || !user || !students) return;
    const entries: any[] = [];
    for (const s of students) {
      const isAbsent = absentMap[s.id] ?? false;
      const val = marksMap[s.id] ?? '';
      if (isAbsent) {
        entries.push({ student_id: s.id, subject_id: selectedSubjectId, exam_id: selectedExam, marks_obtained: null, is_absent: true, max_marks: maxMarks, entered_by: user.id });
        continue;
      }
      if (val === '') continue;
      const obtained = Number(val);
      if (isNaN(obtained) || obtained < 0 || obtained > maxMarks) {
        toast.error(`Invalid marks for ${s.name}. Must be 0–${maxMarks}`);
        return;
      }
      entries.push({ student_id: s.id, subject_id: selectedSubjectId, exam_id: selectedExam, marks_obtained: obtained, is_absent: false, max_marks: maxMarks, entered_by: user.id });
    }
    if (entries.length === 0) { toast.error('Enter marks for at least one student'); return; }
    setSaving(true);
    const { error } = await supabase.from('marks').upsert(entries, { onConflict: 'student_id,subject_id,exam_id' });
    setSaving(false);
    if (error) { console.error('Marks save error:', error); toast.error(error.message); }
    else { toast.success('Marks saved successfully'); queryClient.invalidateQueries({ queryKey: ['marks'] }); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Marks Entry" description="Select class, subject and exam to enter marks" />

        {/* My Assignments */}
        {!tsLoading && teacherSubjects && teacherSubjects.length > 0 && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2.5 rounded-xl gradient-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg">My Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignedClasses.map((cls) => {
                  const subs = teacherSubjects
                    .filter((ts: any) => ts.class_id === cls.id && ts.subjects)
                    .map((ts: any) => ts.subjects.name);
                  return (
                    <div key={cls.id} className="border rounded-xl p-3 bg-muted/30">
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" /> {cls.name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {subs.map((s: string) => (
                          <Badge key={s} variant="secondary" className="rounded-md text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Section */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Select Class, Subject & Exam</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder={tsLoading ? 'Loading...' : 'Select Class'} />
                </SelectTrigger>
                <SelectContent>
                  {assignedClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Subject</label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {assignedSubjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Exam</label>
              <Select value={selectedExam} onValueChange={setSelectedExam} disabled={!selectedSubjectId}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                <SelectContent>
                  {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Max Marks</label>
              <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} min={1} className="rounded-xl h-11" />
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        {allSelected && studentsLoading && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </CardContent>
          </Card>
        )}

        {allSelected && !studentsLoading && (!students || students.length === 0) && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-6">
              <EmptyState message="No students found" description="No students are enrolled in this class." />
            </CardContent>
          </Card>
        )}

        {allSelected && !studentsLoading && students && students.length > 0 && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Enter Marks ({students.length} students)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header-blue">
                      <TableHead className="font-semibold w-12">#</TableHead>
                      <TableHead className="font-semibold">Reg. No</TableHead>
                      <TableHead className="font-semibold">Student Name</TableHead>
                      <TableHead className="font-semibold w-24 text-center">Absent</TableHead>
                      <TableHead className="font-semibold w-32">Marks (/{maxMarks})</TableHead>
                      <TableHead className="font-semibold w-20 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any, idx: number) => {
                      const isAbsent = absentMap[s.id] ?? false;
                      const val = marksMap[s.id] ?? '';
                      const hasValue = val !== '' && !isAbsent;
                      const pct = hasValue ? Math.round((Number(val) / maxMarks) * 100) : null;
                      return (
                        <TableRow key={s.id} className={`transition-colors ${isAbsent ? 'opacity-50 bg-muted/30' : 'hover:bg-accent/50'}`}>
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{s.register_number}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox checked={isAbsent} onCheckedChange={(checked) => setAbsentMap(prev => ({ ...prev, [s.id]: !!checked }))} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} max={maxMarks} value={isAbsent ? '' : val} disabled={isAbsent}
                              onChange={(e) => setMarksMap(prev => ({ ...prev, [s.id]: e.target.value }))}
                              className="w-24 rounded-lg" placeholder={isAbsent ? 'AB' : '—'} />
                          </TableCell>
                          <TableCell className="text-center">
                            {isAbsent ? <Badge variant="outline" className="rounded-lg">AB</Badge>
                              : pct !== null ? <Badge variant={pct >= 40 ? 'default' : 'destructive'} className="rounded-lg">{pct >= 40 ? 'Pass' : 'Fail'}</Badge>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={saving} size="lg" className="gradient-primary rounded-xl px-8 shadow-lg shadow-primary/20">
                  <Save className="h-4 w-4 mr-2" /> {saving ? 'Submitting...' : 'Submit Marks'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!tsLoading && (!teacherSubjects || teacherSubjects.length === 0) && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-6">
              <EmptyState message="No assignments found" description="You have no class-subject assignments. Contact your principal to get assigned." />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
