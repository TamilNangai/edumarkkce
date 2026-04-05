import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, ShieldCheck, Users, Plus, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminApproval() {
  const queryClient = useQueryClient();
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});
  const [deptSelections, setDeptSelections] = useState<Record<string, string>>({});

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ['pending_users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').in('status', ['pending', 'rejected']).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all_users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*, user_roles:user_roles(role)').eq('status', 'active').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['all_classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['all_subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleApprove = async (userId: string, profileId: string) => {
    const role = roleSelections[userId];
    const deptId = deptSelections[userId];
    if (!role) { toast.error('Please select a role before approving'); return; }
    if (!deptId) { toast.error('Please select a department before approving'); return; }

    const { error: statusErr } = await supabase.from('profiles').update({ status: 'active', department_id: deptId }).eq('id', profileId);
    if (statusErr) { toast.error(statusErr.message); return; }

    const { error: roleErr } = await supabase.from('user_roles').upsert({ user_id: userId, role: role as any }, { onConflict: 'user_id,role' });
    if (roleErr) { toast.error(roleErr.message); return; }

    toast.success('User approved');
    queryClient.invalidateQueries({ queryKey: ['pending_users'] });
    queryClient.invalidateQueries({ queryKey: ['all_users'] });
  };

  const handleReject = async (profileId: string) => {
    const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', profileId);
    if (error) { toast.error(error.message); return; }
    toast.success('User rejected');
    queryClient.invalidateQueries({ queryKey: ['pending_users'] });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'outline' as const;
      case 'active': return 'default' as const;
      case 'rejected': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader title="User Management" description="Manage user approvals, roles and assignments" />

        {/* Pending Approvals */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg">Pending Approvals ({pendingUsers?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : !pendingUsers || pendingUsers.length === 0 ? (
              <EmptyState message="No pending users" description="All users have been processed." />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header-blue">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((u: any) => (
                      <TableRow key={u.id} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell><Badge variant={statusColor(u.status)} className="rounded-lg capitalize">{u.status}</Badge></TableCell>
                        <TableCell>
                          <Select value={deptSelections[u.user_id] ?? ''} onValueChange={(v) => setDeptSelections(prev => ({ ...prev, [u.user_id]: v }))}>
                            <SelectTrigger className="w-36 rounded-xl h-9"><SelectValue placeholder="Department" /></SelectTrigger>
                            <SelectContent>
                              {departments?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={roleSelections[u.user_id] ?? ''} onValueChange={(v) => setRoleSelections(prev => ({ ...prev, [u.user_id]: v }))}>
                            <SelectTrigger className="w-36 rounded-xl h-9"><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="coordinator">Coordinator</SelectItem>
                              <SelectItem value="hod">HOD</SelectItem>
                              <SelectItem value="principal">Principal</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprove(u.user_id, u.id)} className="gradient-primary rounded-lg shadow-sm">
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)} className="rounded-lg">
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Users with Assignment Management */}
        {allUsers && allUsers.length > 0 && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg">Active Users ({allUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header-blue">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u: any) => {
                      const userRole = u.user_roles?.[0]?.role;
                      const dept = departments?.find((d: any) => d.id === u.department_id);
                      return (
                        <TableRow key={u.id} className="hover:bg-accent/50 transition-colors">
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell><Badge className="capitalize rounded-lg">{userRole ?? 'No role'}</Badge></TableCell>
                          <TableCell>{dept?.name ?? <span className="text-muted-foreground">Not assigned</span>}</TableCell>
                          <TableCell>
                            {(userRole === 'teacher' || userRole === 'coordinator') && (
                              <AssignmentDialog
                                userId={u.user_id}
                                userName={u.name}
                                userRole={userRole}
                                departmentId={u.department_id}
                                classes={classes ?? []}
                                subjects={subjects ?? []}
                                queryClient={queryClient}
                              />
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
        )}
      </div>
    </DashboardLayout>
  );
}

function AssignmentDialog({ userId, userName, userRole, departmentId, classes, subjects, queryClient }: any) {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const { data: existingAssignments, refetch } = useQuery({
    queryKey: ['user_assignments', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('teacher_subjects').select('*, subjects(*), classes(*)').eq('teacher_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const deptClasses = useMemo(() => {
    if (!departmentId) return classes;
    return classes.filter((c: any) => c.department_id === departmentId);
  }, [classes, departmentId]);

  const deptSubjects = useMemo(() => {
    if (!departmentId) return subjects;
    return subjects.filter((s: any) => s.department_id === departmentId);
  }, [subjects, departmentId]);

  const handleAdd = async () => {
    if (!selectedClass) { toast.error('Select a class'); return; }
    if (selectedSubjects.length === 0) { toast.error('Select at least one subject'); return; }

    const entries = selectedSubjects.map(subId => ({
      teacher_id: userId,
      class_id: selectedClass,
      subject_id: subId,
    }));

    const { error } = await supabase.from('teacher_subjects').upsert(entries, { onConflict: 'teacher_id,class_id,subject_id' }).select();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Assignments added');
    setSelectedClass('');
    setSelectedSubjects([]);
    refetch();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('teacher_subjects').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Assignment removed');
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-lg">
          <Edit2 className="h-3.5 w-3.5 mr-1" /> Assignments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Assignments — {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Existing assignments */}
          {existingAssignments && existingAssignments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Current Assignments</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {existingAssignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-sm">{a.classes?.name} — {a.subjects?.name}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleRemove(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new */}
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">Add Assignment</p>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                {deptClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Select Subjects</p>
              {deptSubjects.map((s: any) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedSubjects.includes(s.id)}
                    onCheckedChange={(checked) =>
                      setSelectedSubjects(prev => checked ? [...prev, s.id] : prev.filter(id => id !== s.id))
                    }
                  />
                  <span className="text-sm">{s.name} ({s.code})</span>
                </label>
              ))}
            </div>
            <Button onClick={handleAdd} className="w-full gradient-primary rounded-xl">
              <Plus className="h-4 w-4 mr-1" /> Add Assignment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
