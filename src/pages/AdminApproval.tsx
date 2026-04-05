import { useState } from 'react';
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
import { Check, X, ShieldCheck, Users } from 'lucide-react';

export default function AdminApproval() {
  const queryClient = useQueryClient();
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});

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

  const handleApprove = async (userId: string, profileId: string) => {
    const role = roleSelections[userId];
    if (!role) { toast.error('Please select a role before approving'); return; }
    const { error: statusErr } = await supabase.from('profiles').update({ status: 'active' }).eq('id', profileId);
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
        <PageHeader title="User Management" description="Manage user approvals and role assignments" />

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
                      <TableHead className="font-semibold">Assign Role</TableHead>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u: any) => (
                      <TableRow key={u.id} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge className="capitalize rounded-lg">{u.user_roles?.[0]?.role ?? 'No role'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
