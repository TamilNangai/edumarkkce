import {
  LayoutDashboard, BookOpen, Users, Building2, BarChart3, LogOut, GraduationCap, ShieldCheck, UserPlus,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = {
  teacher: [
    { title: 'Marks Entry', url: '/', icon: BookOpen },
    { title: 'Reports', url: '/reports', icon: BarChart3 },
  ],
  coordinator: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Class View', url: '/class-view', icon: Users },
    { title: 'Reports', url: '/reports', icon: BarChart3 },
  ],
  hod: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Department View', url: '/department-view', icon: Building2 },
    { title: 'Manage Students', url: '/manage-students', icon: Users },
    { title: 'Reports', url: '/reports', icon: BarChart3 },
  ],
  principal: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Class View', url: '/class-view', icon: Users },
    { title: 'Department View', url: '/department-view', icon: Building2 },
    { title: 'Reports', url: '/reports', icon: BarChart3 },
    { title: 'User Management', url: '/admin/users', icon: ShieldCheck },
  ],
};

export function AppSidebar() {
  const { role, profile, signOut } = useAuthStore();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const items = role ? navItems[role] : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2.5 px-4 py-5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-md">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && <span className="font-bold text-sm tracking-tight">EduMark</span>}
          </SidebarGroupLabel>
          {!collapsed && <Separator className="mb-2 opacity-20" />}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild className="rounded-xl h-10 transition-all duration-200">
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                      className="hover:bg-sidebar-accent/60"
                    >
                      <item.icon className="mr-2.5 h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && profile && (
          <div className="mb-3 px-2">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sidebar-accent/40">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                {profile.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-sidebar-foreground truncate">{profile.name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded-xl h-9 transition-all"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && 'Sign Out'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
