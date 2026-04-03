import {
  LayoutDashboard, BookOpen, Users, Building2, BarChart3, LogOut, GraduationCap, ShieldCheck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = {
  teacher: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Marks Entry', url: '/marks-entry', icon: BookOpen },
  ],
  coordinator: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Class View', url: '/class-view', icon: Users },
  ],
  hod: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Department View', url: '/department-view', icon: Building2 },
    { title: 'Reports', url: '/reports', icon: BarChart3 },
  ],
  principal: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Marks Entry', url: '/marks-entry', icon: BookOpen },
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
          <SidebarGroupLabel className="flex items-center gap-2 px-3 py-4">
            <GraduationCap className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-bold text-sm">College Marks</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/'} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
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
          <div className="mb-2 text-xs truncate text-sidebar-foreground/70">
            <p className="font-medium text-sidebar-foreground">{profile.name}</p>
            <p className="capitalize">{role}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && 'Sign Out'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
