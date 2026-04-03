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
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 shrink-0">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{profile?.name}</span>
              <span className="ml-2 capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{role}</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
