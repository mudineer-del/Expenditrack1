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
import { OgdclMark } from "@/components/shared/OgdclMark"
import { SidebarContractsWidget } from "@/components/shell/SidebarContractsWidget"
import { useAuth } from "@/hooks/useAuth"
import { useLabelsStore } from "@/store/useLabelsStore"

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
  const sidebarTitle = useLabelsStore((s) => s.sidebarTitle)
  const sidebarSubtitle = useLabelsStore((s) => s.sidebarSubtitle)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <OgdclMark size="sm" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">{sidebarTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{sidebarSubtitle}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const restricted = "adminOnly" in item && item.adminOnly && !isAdmin
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild={!restricted}
                      disabled={restricted}
                      tooltip={restricted ? "Only Admins can access Users" : item.label}
                    >
                      {restricted ? (
                        <>
                          <item.icon />
                          <span>{item.label}</span>
                        </>
                      ) : (
                        <NavLink
                          to={item.to}
                          end={"end" in item ? item.end : false}
                          className={({ isActive }) => (isActive ? "bg-sidebar-accent font-medium" : "")}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Rendered outside SidebarContent so it stays pinned above the footer instead of
          scrolling with the nav — SidebarContent's flex-1 already fills the gap above this. */}
      <SidebarContractsWidget />
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
