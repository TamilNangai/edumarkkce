import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Upload, Users, Trash2 } from 'lucide-react';

interface ClassOption {
  id: string;
  name: string;
  year: number;
}

interface Student {
  id: string;
  name: string;
  register_number: string;
  class_id: string;
}

export default function ManageStudents() {
  const { profile } = useAuthStore();
  const departmentId = profile?.department_id;

  const [year, setYear] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manual entry
  const [studentName, setStudentName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');

  // CSV
  const [csvRows, setCsvRows] = useState<{ name: string; register_number: string }[]>([]);

  // Load classes when year changes
  useEffect(() => {
    if (!departmentId || !year) { setClasses([]); setSelectedClassId(''); return; }
    setLoadingClasses(true);
    supabase
      .from('classes')
      .select('id, name, year')
      .eq('department_id', departmentId)
      .eq('year', parseInt(year))
      .then(({ data, error }) => {
        if (error) { console.error(error); toast.error('Failed to load classes'); }
        setClasses((data as ClassOption[]) || []);
        setSelectedClassId('');
        setLoadingClasses(false);
      });
  }, [departmentId, year]);

  // Load students when class changes
  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) { setStudents([]); return; }
    setLoadingStudents(true);
    const { data, error } = await supabase
      .from('students')
      .select('id, name, register_number, class_id')
      .eq('class_id', selectedClassId)
      .order('register_number');
    if (error) console.error(error);
    setStudents((data as Student[]) || []);
    setLoadingStudents(false);
  }, [selectedClassId]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleManualAdd = async () => {
    if (!studentName.trim() || !registerNumber.trim()) {
      toast.error('Please fill in both name and register number'); return;
    }
    if (!selectedClassId) { toast.error('Please select a class first'); return; }

    // Check duplicate
    if (students.some(s => s.register_number === registerNumber.trim())) {
      toast.error('Duplicate register number in this class'); return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('students').insert({
      name: studentName.trim(),
      register_number: registerNumber.trim(),
      class_id: selectedClassId,
    });
    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error(error.message.includes('duplicate') ? 'Duplicate register number' : 'Failed to add student');
      return;
    }
    toast.success('Student added');
    setStudentName('');
    setRegisterNumber('');
    fetchStudents();
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      // Skip header if present
      const start = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
      const rows = lines.slice(start).map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { name: parts[0] || '', register_number: parts[1] || '' };
      }).filter(r => r.name && r.register_number);
      setCsvRows(rows);
      toast.info(`${rows.length} students parsed from CSV`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkSubmit = async () => {
    if (!selectedClassId) { toast.error('Please select a class first'); return; }
    if (csvRows.length === 0) { toast.error('No CSV data to upload'); return; }

    // Check for duplicates against existing
    const existingRegs = new Set(students.map(s => s.register_number));
    const duplicates = csvRows.filter(r => existingRegs.has(r.register_number));
    if (duplicates.length > 0) {
      toast.error(`${duplicates.length} duplicate register numbers found. Remove them first.`);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('students').insert(
      csvRows.map(r => ({ name: r.name, register_number: r.register_number, class_id: selectedClassId }))
    );
    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error('Bulk upload failed: ' + error.message);
      return;
    }
    toast.success(`${csvRows.length} students uploaded`);
    setCsvRows([]);
    fetchStudents();
  };

  const removeCsvRow = (idx: number) => setCsvRows(prev => prev.filter((_, i) => i !== idx));

  if (!departmentId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">No department assigned. Contact the Principal.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Manage Students</h1>
          <p className="text-muted-foreground text-sm">Add students to classes in your department</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Class</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="w-40">
              <Label className="text-xs">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(y => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <Label className="text-xs">Class</Label>
              {loadingClasses ? (
                <div className="h-10 flex items-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : (
                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classes.length === 0}>
                  <SelectTrigger><SelectValue placeholder={classes.length === 0 ? 'No classes' : 'Select class'} /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Students */}
        {selectedClassId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Add Students</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="manual">
                <TabsList className="mb-4">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="manual">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[180px]">
                      <Label className="text-xs">Student Name</Label>
                      <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. John Doe" />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <Label className="text-xs">Register Number</Label>
                      <Input value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} placeholder="e.g. 22CSR001" />
                    </div>
                    <Button onClick={handleManualAdd} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Add
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="csv">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs mb-1 block">Upload CSV (columns: Name, RegisterNumber)</Label>
                      <Input type="file" accept=".csv" onChange={handleCsvUpload} />
                    </div>
                    {csvRows.length > 0 && (
                      <>
                        <div className="border rounded-lg overflow-auto max-h-60">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Register No</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvRows.map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell className="py-1.5">{r.name}</TableCell>
                                  <TableCell className="py-1.5">{r.register_number}</TableCell>
                                  <TableCell className="py-1.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCsvRow(i)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <Button onClick={handleBulkSubmit} disabled={submitting}>
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                          Upload {csvRows.length} Students
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Student List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students {selectedClassId && `(${students.length})`}
            </CardTitle>
            {!selectedClassId && <CardDescription>Select a class above to view students</CardDescription>}
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !selectedClassId ? null : students.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No students found in this class</p>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Register Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.register_number}</TableCell>
                      </TableRow>
                    ))}
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
