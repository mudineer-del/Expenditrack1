import {
  BarChart3,
  Building2,
  History,
  LayoutGrid,
  List,
  Users,
} from "lucide-react"
import { NavLink } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/invoices", label: "Invoices", icon: List },
  { to: "/vendors", label: "Vendors & Contracts", icon: Building2 },
  { to: "/reports", label: "Financial Reports", icon: BarChart3 },
  { to: "/activity", label: "Activity Log", icon: History },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
] as const

export function AppSidebar() {
  const { user, isAdmin } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            DF
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">OGDCL</p>
            <p className="truncate text-xs text-muted-foreground">Drilling Fluids Tracker</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.filter((item) => !("adminOnly" in item) || !item.adminOnly || isAdmin).map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      end={"end" in item ? item.end : false}
                      className={({ isActive }) => (isActive ? "bg-sidebar-accent font-medium" : "")}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile & settings">
              <NavLink to="/settings">
                <Avatar className="size-5">
                  <AvatarFallback className="text-[10px]">{user?.initials || "?"}</AvatarFallback>
                </Avatar>
                <span className="truncate">{user?.name || "Account"}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
