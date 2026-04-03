import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'teacher' | 'coordinator' | 'hod' | 'principal';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { name: string; email: string; department_id: string | null } | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  fetchRole: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<() => void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  fetchRole: async () => {
    const user = get().user;
    if (!user) { set({ role: null }); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    set({ role: (data?.role as AppRole) ?? null });
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user) { set({ profile: null }); return; }
    const { data } = await supabase
      .from('profiles')
      .select('name, email, department_id')
      .eq('user_id', user.id)
      .maybeSingle();
    set({ profile: data ?? null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, role: null, profile: null });
  },

  initialize: async () => {
    set({ loading: true });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks
          setTimeout(async () => {
            await get().fetchRole();
            await get().fetchProfile();
            set({ loading: false });
          }, 0);
        } else {
          set({ role: null, profile: null, loading: false });
        }
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ session, user: session.user });
      await get().fetchRole();
      await get().fetchProfile();
    }
    set({ loading: false });

    return () => subscription.unsubscribe();
  },
}));
