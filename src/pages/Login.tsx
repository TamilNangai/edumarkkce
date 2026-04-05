import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { GraduationCap, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (profile?.status === 'pending') {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error('Your account is pending approval. Please contact the administrator.');
      return;
    }
    if (profile?.status === 'rejected') {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error('Your account has been rejected. Please contact the administrator.');
      return;
    }
    setLoading(false);
    toast.success('Logged in successfully');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Please check your email to verify, then wait for admin approval.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="text-center space-y-4 pb-2 pt-8">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg ring-4 ring-primary/20">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">College Marks System</CardTitle>
              <CardDescription className="mt-1">Manage exams, marks & reports</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-8 px-8">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-11">
                <TabsTrigger value="login" className="rounded-lg text-sm font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-sm font-medium">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30" disabled={loading}>
                    {loading ? 'Signing in...' : <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30" disabled={loading}>
                    {loading ? 'Creating account...' : <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    After signup, an admin must approve your account before you can log in.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
