import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuthStore } from '@/store/useAuthStore';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, role } = useAuthStore();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center border-b bg-card/80 backdrop-blur-sm px-6 gap-3 shrink-0 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-foreground leading-tight">{profile?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md">
                {profile?.name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 gradient-page overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
