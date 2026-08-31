import { useState } from "react"
import {
  BarChart3,
  Building2,
  ChevronRight,
  Download,
  History,
  LayoutGrid,
  List,
  MessagesSquare,
  Settings,
  Users,
} from "lucide-react"
import type { ComponentType, CSSProperties } from "react"
import { NavLink, useLocation } from "react-router-dom"
import wellCostNavIcon from "@/assets/well-cost-nav-icon-3d.png"
import wellCostDashboardIcon from "@/assets/well-cost-dashboard-icon-3d.png"
import wellRegistryIcon from "@/assets/well-registry-icon-3d.png"
import costStructureIcon from "@/assets/cost-structure-icon-3d.png"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { OgdclMark } from "@/components/shared/OgdclMark"
import { DepartmentSwitcher } from "@/components/shell/DepartmentSwitcher"
import { SidebarIcon } from "@/components/shell/NavIcon"
import { SidebarContractsWidget } from "@/components/shell/SidebarContractsWidget"
import { activeNavStyle, NAV_ITEM_COLORS } from "@/lib/navColors"
import { useAuth } from "@/hooks/useAuth"
import { useActivityLogQuery } from "@/hooks/useActivityLog"
import { useMessagesQuery } from "@/hooks/useMessages"
import { useAppStore } from "@/store/useAppStore"
import { useLabelsStore } from "@/store/useLabelsStore"
import { useLastSeenStore } from "@/store/useLastSeenStore"
import { useMessagesLastSeenStore } from "@/store/useMessagesLastSeenStore"
import { useSidebarPrefsStore } from "@/store/useSidebarPrefsStore"

/** Wraps a static icons8 3D glyph so it drops into NavIconChip's/NavIcon's `icon`
 *  slot alongside the lucide components — both just need something that accepts
 *  className (and, for NavIcon, an ignorable style pass-through). */
function imgIcon(src: string) {
  return function ImgIcon({ className, style }: { className?: string; style?: CSSProperties }) {
    return <img src={src} alt="" className={className} style={style} />
  }
}
const WellCostRigIcon = imgIcon(wellCostNavIcon)
const WellCostDashboardIcon = imgIcon(wellCostDashboardIcon)
const WellRegistryIcon = imgIcon(wellRegistryIcon)
const CostStructureIcon = imgIcon(costStructureIcon)

/** Routes that stay visible regardless of Settings > Labels > Sidebar Customization's
 *  hidden-items list — Dashboard as a guaranteed landing spot, Settings as the only
 *  way back to that same panel to re-show anything else. Exported so LabelsTab's
 *  item-visibility checklist excludes the same two routes from its checkboxes. */
export const ALWAYS_VISIBLE_PATHS = new Set(["/", "/settings"])

/** Grouped the way a lot of finance-product dashboards do it — day-to-day work
 *  separated from oversight/admin — instead of one flat list. Exported so LabelsTab's
 *  Sidebar Customization section can build its item-visibility checklist from the
 *  same source of truth instead of a second hardcoded item list that could drift. */
export const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
      { to: "/invoices", label: "Invoices", icon: List },
      { to: "/vendors", label: "Vendors & Contracts", icon: Building2 },
      {
        label: "Well Cost",
        icon: WellCostRigIcon,
        children: [
          { to: "/well-cost", label: "Well Cost Dashboard", icon: WellCostDashboardIcon, colorKey: "/well-cost/dashboard", end: true },
          { to: "/well-cost/wells", label: "Well Registry", icon: WellRegistryIcon, colorKey: "/well-cost/wells" },
          { to: "/well-cost/structure", label: "Cost Structure", icon: CostStructureIcon, colorKey: "/well-cost/structure" },
        ],
      },
      { to: "/reports", label: "Financial Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/messages", label: "Message Centre", icon: MessagesSquare },
      { to: "/activity", label: "Audit Trail", icon: History },
      { to: "/users", label: "User Management", icon: Users, adminOnly: true },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/install", label: "App Installation", icon: Download },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const

export interface HideableNavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  group: string
}

/** Flat, plainly-typed projection of NAV_GROUPS' hideable leaves — LabelsTab's
 *  Sidebar Customization checklist builds from this instead of NAV_GROUPS directly,
 *  since the latter's `as const` literal-tuple typing (needed for AppSidebar's own
 *  discriminated-union narrowing) doesn't flatMap cleanly across per-position literal
 *  types. A plain for-loop sidesteps that inference trouble entirely. */
function collectHideableNavItems(): HideableNavItem[] {
  const result: HideableNavItem[] = []
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if ("children" in item) {
        for (const child of item.children) {
          result.push({ to: child.to, label: child.label, icon: child.icon, group: group.label })
        }
      } else if (!ALWAYS_VISIBLE_PATHS.has(item.to)) {
        result.push({ to: item.to, label: item.label, icon: item.icon, group: group.label })
      }
    }
  }
  return result
}

export const HIDEABLE_NAV_ITEMS: HideableNavItem[] = collectHideableNavItems()

export function AppSidebar() {
  const { user, isAdmin } = useAuth()
  const location = useLocation()
  const [wellCostExpanded, setWellCostExpanded] = useState(location.pathname.startsWith("/well-cost"))
  const sidebarTitle = useLabelsStore((s) => s.sidebarTitle)
  const sidebarSubtitle = useLabelsStore((s) => s.sidebarSubtitle)
  const iconStyle = useSidebarPrefsStore((s) => s.iconStyle)
  const activeColorMode = useSidebarPrefsStore((s) => s.activeColorMode)
  const density = useSidebarPrefsStore((s) => s.density)
  const hiddenItems = useSidebarPrefsStore((s) => s.hiddenItems)
  const flatIcons = iconStyle === "flat"
  const compactDensity = density === "compact"
  const topLevelSize = compactDensity ? "default" : "lg"
  // Admin-granted areas (supabase/access_control_setup.sql, profile_areas) are the
  // security floor — hiddenItems above is a purely cosmetic per-device layer on top
  // of whatever this returns true for. Admins bypass grants entirely, same as RequireArea.
  const grantedAreas = user?.areas ?? []
  const canSeeArea = (path: string) =>
    isAdmin || user?.accessControlInstalled === false || grantedAreas.includes(path)
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
    <Sidebar collapsible="icon" className="app-sidebar border-r-0" data-density={density}>
      <SidebarHeader className="app-sidebar-header">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <OgdclMark size="sm" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="app-sidebar-brand-title truncate text-[15px] font-extrabold tracking-tight">{sidebarTitle}</p>
            <p className="app-sidebar-subtitle truncate text-[11px]">{sidebarSubtitle}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <DepartmentSwitcher />
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) =>
              "children" in item ||
              ALWAYS_VISIBLE_PATHS.has(item.to) ||
              (canSeeArea(item.to) && !hiddenItems.includes(item.to))
          )
          if (visibleItems.length === 0) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="app-sidebar-group-label uppercase tracking-[0.09em]">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    if ("children" in item) {
                      const color = NAV_ITEM_COLORS["/well-cost"]
                      const visibleChildren = item.children.filter(
                        (child) => canSeeArea(child.to) && !hiddenItems.includes(child.to)
                      )
                      if (visibleChildren.length === 0) return null
                      return (
                        <SidebarMenuItem
                          key={item.label}
                          onMouseEnter={() => setWellCostExpanded(true)}
                          onMouseLeave={() => setWellCostExpanded(false)}
                        >
                          <SidebarMenuButton size={topLevelSize} onClick={() => setWellCostExpanded((v) => !v)} tooltip={item.label}>
                            <SidebarIcon icon={item.icon} color={color} flat={flatIcons} />
                            <span>{item.label}</span>
                            <ChevronRight
                              className={`ml-auto size-4 shrink-0 transition-transform ${wellCostExpanded ? "rotate-90" : ""}`}
                            />
                          </SidebarMenuButton>
                            <SidebarMenuSub className={`app-well-submenu ${wellCostExpanded ? "is-open" : ""}`}>
                              {visibleChildren.map((child) => (
                                <SidebarMenuSubItem key={child.to}>
                                  <SidebarMenuSubButton asChild className="app-sidebar-subnav">
                                    <NavLink
                                      to={child.to}
                                      end={"end" in child ? child.end : false}
                                      onClick={() => setWellCostExpanded(false)}
                                      className={({ isActive }) => (isActive ? "bg-sidebar-accent font-medium" : "")}
                                      style={
                                        activeColorMode === "perItem"
                                          ? ({ isActive }) => (isActive ? activeNavStyle(NAV_ITEM_COLORS[child.colorKey]) : undefined)
                                          : undefined
                                      }
                                    >
                                      {({ isActive }) => (
                                        <>
                                          <SidebarIcon
                                            icon={child.icon}
                                            color={NAV_ITEM_COLORS[child.colorKey]}
                                            compact
                                            active={isActive}
                                            flat={flatIcons}
                                          />
                                          <span>{child.label}</span>
                                        </>
                                      )}
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                        </SidebarMenuItem>
                      )
                    }
                    const restricted = "adminOnly" in item && item.adminOnly && !isAdmin
                    const badgeCount = item.to === "/activity" ? unreadActivity : item.to === "/messages" ? unreadMessages : 0
                    const color = NAV_ITEM_COLORS[item.to]
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild={!restricted}
                          disabled={restricted}
                          size={topLevelSize}
                          tooltip={restricted ? "Only Admins can access Users" : item.label}
                        >
                          {restricted ? (
                            <>
                              <SidebarIcon icon={item.icon} color={color} flat={flatIcons} />
                              <span>{item.label}</span>
                            </>
                          ) : (
                            <NavLink
                              to={item.to}
                              end={"end" in item ? item.end : false}
                              className={({ isActive }) => (isActive ? "bg-sidebar-accent font-medium" : "")}
                              style={activeColorMode === "perItem" ? ({ isActive }) => (isActive ? activeNavStyle(color) : undefined) : undefined}
                            >
                              {({ isActive }) => (
                                <>
                                  {isActive && (
                                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-white/85" />
                                  )}
                                  <SidebarIcon icon={item.icon} color={color} active={isActive} flat={flatIcons} />
                                  <span>{item.label}</span>
                                </>
                              )}
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                        {badgeCount > 0 && (
                          <SidebarMenuBadge
                            className="border-0 text-white"
                            style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                          >
                            {badgeCount}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                  )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      {/* Rendered outside SidebarContent so it stays pinned above the footer instead of
          scrolling with the nav — SidebarContent's flex-1 already fills the gap above this. */}
      <SidebarContractsWidget />
      <SidebarFooter className="app-sidebar-footer">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile & settings">
              <NavLink to="/settings">
                <Avatar className="size-5">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback className="text-[10px]">{user?.initials || "?"}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold tracking-tight">{user?.name || "Account"}</span>
                  <span className="block truncate text-[10px] font-medium uppercase tracking-[0.07em] opacity-60">
                    {isAdmin ? "Administrator" : "User"}
                  </span>
                </span>
                <ChevronRight className="size-3.5 opacity-45" />
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
