import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTeacherSubjects, useStudentsByClass, useExams } from '@/hooks/useMarksData';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';

export default function MarksEntry() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: teacherSubjects, isLoading: tsLoading } = useTeacherSubjects();
  const { data: exams } = useExams();

  const [selectedTs, setSelectedTs] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const ts = teacherSubjects?.find((t: any) => t.id === selectedTs);
  const { data: students } = useStudentsByClass(ts?.class_id ?? null);

  const handleSave = async () => {
    if (!ts || !selectedExam || !user) return;
    const entries = Object.entries(marksMap)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([studentId, obtained]) => ({
        student_id: studentId,
        subject_id: ts.subject_id,
        exam_id: selectedExam,
        marks_obtained: obtained,
        max_marks: maxMarks,
        entered_by: user.id,
      }));

    if (entries.length === 0) {
      toast.error('Enter marks for at least one student');
      return;
    }

    const invalid = entries.find(e => e.marks_obtained < 0 || e.marks_obtained > maxMarks);
    if (invalid) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('marks').upsert(entries, {
      onConflict: 'student_id,subject_id,exam_id',
    });
    setSaving(false);

    if (error) {
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
          <CardHeader>
            <CardTitle>Select Subject & Exam</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={selectedTs} onValueChange={setSelectedTs}>
              <SelectTrigger><SelectValue placeholder="Select Subject/Class" /></SelectTrigger>
              <SelectContent>
                {teacherSubjects?.map((ts: any) => (
                  <SelectItem key={ts.id} value={ts.id}>
                    {ts.subjects?.name} - {ts.classes?.name}
                  </SelectItem>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Enter Marks</CardTitle>
              <Button onClick={handleSave} disabled={saving} className="gradient-primary">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Marks'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg. No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-32">Marks (/{maxMarks})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.register_number}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={maxMarks}
                          value={marksMap[s.id] ?? ''}
                          onChange={(e) =>
                            setMarksMap(prev => ({ ...prev, [s.id]: Number(e.target.value) }))
                          }
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
