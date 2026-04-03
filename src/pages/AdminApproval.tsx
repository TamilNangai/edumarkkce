import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, ShieldCheck } from 'lucide-react';

export default function AdminApproval() {
  const queryClient = useQueryClient();
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ['pending_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('status', ['pending', 'rejected'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_roles:user_roles(role)')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleApprove = async (userId: string, profileId: string) => {
    const role = roleSelections[userId];
    if (!role) {
      toast.error('Please select a role before approving');
      return;
    }

    const { error: statusErr } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', profileId);

    if (statusErr) { toast.error(statusErr.message); return; }

    const { error: roleErr } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: role as any }, { onConflict: 'user_id,role' });

    if (roleErr) { toast.error(roleErr.message); return; }

    toast.success('User approved');
    queryClient.invalidateQueries({ queryKey: ['pending_users'] });
    queryClient.invalidateQueries({ queryKey: ['all_users'] });
  };

  const handleReject = async (profileId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', profileId);

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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals ({pendingUsers?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : !pendingUsers || pendingUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No pending users.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assign Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(u.status)}>{u.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={roleSelections[u.user_id] ?? ''}
                            onValueChange={(v) => setRoleSelections(prev => ({ ...prev, [u.user_id]: v }))}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
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
                            <Button size="sm" onClick={() => handleApprove(u.user_id, u.id)} className="gradient-primary">
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)}>
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
          <Card>
            <CardHeader>
              <CardTitle>Active Users ({allUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge className="capitalize">
                            {u.user_roles?.[0]?.role ?? 'No role'}
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
      </div>
    </DashboardLayout>
  );
}
