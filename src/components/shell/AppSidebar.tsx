import {
  BarChart3,
  Building2,
  Download,
  History,
  LayoutGrid,
  List,
  MessagesSquare,
  Settings,
  Users,
} from "lucide-react"
import { NavLink } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { OgdclMark } from "@/components/shared/OgdclMark"
import { DepartmentSwitcher } from "@/components/shell/DepartmentSwitcher"
import { SidebarContractsWidget } from "@/components/shell/SidebarContractsWidget"
import { useAuth } from "@/hooks/useAuth"
import { useActivityLogQuery } from "@/hooks/useActivityLog"
import { useMessagesQuery } from "@/hooks/useMessages"
import { useAppStore } from "@/store/useAppStore"
import { useLabelsStore } from "@/store/useLabelsStore"
import { useLastSeenStore } from "@/store/useLastSeenStore"
import { useMessagesLastSeenStore } from "@/store/useMessagesLastSeenStore"

/** Grouped the way a lot of finance-product dashboards do it — day-to-day work
 *  separated from oversight/admin — instead of one flat list. */
const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
      { to: "/invoices", label: "Invoices", icon: List },
      { to: "/vendors", label: "Vendors & Contracts", icon: Building2 },
      { to: "/reports", label: "Financial Reports", icon: BarChart3 },
      { to: "/messages", label: "Message Centre", icon: MessagesSquare },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/activity", label: "Activity Log", icon: History },
      { to: "/users", label: "Users", icon: Users, adminOnly: true },
    ],
  },
  {
    label: "App",
    items: [
      { to: "/install", label: "Install App", icon: Download },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const

export function AppSidebar() {
  const { user, isAdmin } = useAuth()
  const sidebarTitle = useLabelsStore((s) => s.sidebarTitle)
  const sidebarSubtitle = useLabelsStore((s) => s.sidebarSubtitle)
  const activityLogQuery = useActivityLogQuery()
  const lastSeenTs = useLastSeenStore((s) => s.lastSeenTs)
  // Live (not snapshotted) — clears itself the moment the user actually visits Activity Log,
  // since that page's own markSeen() call updates the same stored timestamp this reads.
  const unreadActivity = lastSeenTs > 0 ? (activityLogQuery.data ?? []).filter((e) => e.ts > lastSeenTs).length : 0

  const activeDept = useAppStore((s) => s.activeDept)
  const messagesQuery = useMessagesQuery()
  const lastSeenMessagesTs = useMessagesLastSeenStore((s) => s.lastSeenTs)
  const unreadMessages =
    lastSeenMessagesTs > 0
      ? (messagesQuery.data ?? []).filter(
          (m) =>
            m.createdAt > lastSeenMessagesTs &&
            m.senderId !== user?.id &&
            (m.recipientId === user?.id || (m.recipientId === null && (activeDept === "ALL" || m.department === activeDept)))
        ).length
      : 0

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
        <DepartmentSwitcher />
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase tracking-wide">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const restricted = "adminOnly" in item && item.adminOnly && !isAdmin
                  const badgeCount = item.to === "/activity" ? unreadActivity : item.to === "/messages" ? unreadMessages : 0
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
                      {badgeCount > 0 && <SidebarMenuBadge className="bg-primary text-primary-foreground">{badgeCount}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
