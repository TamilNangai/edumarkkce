import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Search } from 'lucide-react';

export default function MarksEntry() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: teacherSubjects, isLoading: tsLoading } = useTeacherSubjects();
  const { data: exams } = useExams();

  const [selectedTs, setSelectedTs] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [absentMap, setAbsentMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const ts = teacherSubjects?.find((t: any) => t.id === selectedTs);
  const { data: students } = useStudentsByClass(ts?.class_id ?? null);

  const { data: existingMarks } = useMarks({
    subject_id: ts?.subject_id,
    exam_id: selectedExam || undefined,
  });

  // Pre-fill marks from existing data using is_absent flag
  useEffect(() => {
    if (existingMarks && existingMarks.length > 0) {
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
    } else {
      setMarksMap({});
      setAbsentMap({});
    }
  }, [existingMarks]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!debouncedSearch) return students;
    const term = debouncedSearch.toLowerCase();
    return students.filter((s: any) =>
      s.name.toLowerCase().includes(term) ||
      s.register_number.toLowerCase().includes(term)
    );
  }, [students, debouncedSearch]);

  const handleSave = async () => {
    if (!ts || !selectedExam || !user) return;

    const entries = (students || []).map((s: any) => {
      const isAbsent = absentMap[s.id] ?? false;
      const val = marksMap[s.id];

      if (isAbsent) {
        return {
          student_id: s.id,
          subject_id: ts.subject_id,
          exam_id: selectedExam,
          marks_obtained: null,
          is_absent: true,
          max_marks: maxMarks,
          entered_by: user.id,
        };
      }

      if (val === undefined || val === '') return null; // Not entered, skip
      const obtained = Number(val);
      if (isNaN(obtained) || obtained < 0 || obtained > maxMarks) {
        toast.error(`Invalid marks for student. Must be 0–${maxMarks}`);
        return 'INVALID';
      }
      return {
        student_id: s.id,
        subject_id: ts.subject_id,
        exam_id: selectedExam,
        marks_obtained: obtained,
        is_absent: false,
        max_marks: maxMarks,
        entered_by: user.id,
      };
    });

    if (entries.includes('INVALID')) return;
    const validEntries = entries.filter((e): e is Record<string, any> => e !== null && e !== 'INVALID');

    if (validEntries.length === 0) {
      toast.error('Enter marks for at least one student');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('marks').upsert(validEntries as any[], {
      onConflict: 'student_id,subject_id,exam_id',
    });
    setSaving(false);

    if (error) {
      console.error('Marks save error:', error);
      toast.error(error.message);
    } else {
      toast.success('Marks saved successfully');
      queryClient.invalidateQueries({ queryKey: ['marks'] });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Marks Entry</h1>

        <Card>
          <CardHeader><CardTitle>Select Subject & Exam</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={selectedTs} onValueChange={(v) => { setSelectedTs(v); setMarksMap({}); setAbsentMap({}); }}>
              <SelectTrigger><SelectValue placeholder="Select Subject/Class" /></SelectTrigger>
              <SelectContent>
                {teacherSubjects?.map((ts: any) => (
                  <SelectItem key={ts.id} value={ts.id}>
                    {ts.subjects?.name} - {ts.classes?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedExam} onValueChange={(v) => { setSelectedExam(v); setMarksMap({}); setAbsentMap({}); }}>
              <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Max Marks"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              min={1}
            />
          </CardContent>
        </Card>

        {students && students.length > 0 && selectedExam && (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle>Enter Marks</CardTitle>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-56"
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="gradient-primary shrink-0">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No students found matching your search.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reg. No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-24">Absent</TableHead>
                        <TableHead className="w-32">Marks (/{maxMarks})</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s: any) => {
                        const isAbsent = absentMap[s.id] ?? false;
                        const val = marksMap[s.id] ?? '';
                        const hasValue = val !== '' && !isAbsent;
                        const pct = hasValue ? Math.round((Number(val) / maxMarks) * 100) : null;
                        return (
                          <TableRow key={s.id} className={isAbsent ? 'opacity-60' : ''}>
                            <TableCell className="font-mono">{s.register_number}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={isAbsent}
                                onCheckedChange={(checked) =>
                                  setAbsentMap(prev => ({ ...prev, [s.id]: !!checked }))
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={maxMarks}
                                value={isAbsent ? '' : val}
                                disabled={isAbsent}
                                onChange={(e) =>
                                  setMarksMap(prev => ({ ...prev, [s.id]: e.target.value }))
                                }
                                className="w-24"
                                placeholder={isAbsent ? 'AB' : '—'}
                              />
                            </TableCell>
                            <TableCell>
                              {isAbsent ? (
                                <Badge variant="outline">AB</Badge>
                              ) : pct !== null ? (
                                <Badge variant={pct >= 40 ? 'default' : 'destructive'}>
                                  {pct >= 40 ? 'Pass' : 'Fail'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
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
        )}

        {selectedTs && selectedExam && students && students.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No students found for the selected class.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
