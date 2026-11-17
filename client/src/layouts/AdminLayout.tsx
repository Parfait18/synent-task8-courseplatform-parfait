import { BookOpen, CreditCard, GraduationCap, LayoutDashboard, LogOut, Undo2, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/auth-context'
import { Logo } from '@/components/Logo'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

const items = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/enrollments', label: 'Enrollments', icon: GraduationCap },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
]

function AdminNav() {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
              <NavLink to={item.to} end={item.end} onClick={() => setOpenMobile(false)}>
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

/** Dense, neutral work surface for admins, separate from the learner layout. */
export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="admin-surface">
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Link to="/admin" className="flex items-center gap-2 rounded-md px-2 py-1.5">
              <Logo className="text-lg group-data-[collapsible=icon]:[&>svg~*]:hidden" />
              <span className="rounded bg-ink px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white group-data-[collapsible=icon]:hidden">Admin</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Manage</SidebarGroupLabel>
              <SidebarGroupContent><AdminNav /></SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to the site">
                  <Link to="/"><Undo2 aria-hidden="true" /><span>Back to the site</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Sign out" onClick={async () => { await logout(); navigate('/') }}>
                  <LogOut aria-hidden="true" /><span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <p className="truncate px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{user?.email}</p>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="min-w-0 bg-white">
          <header className="flex h-12 items-center gap-2 border-b border-line px-3 sm:px-4">
            <SidebarTrigger aria-label="Toggle the sidebar" />
            <Separator orientation="vertical" className="mx-1 h-5!" />
            <p className="text-sm text-muted-foreground">Kalam administration</p>
          </header>
          <main id="main" className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
