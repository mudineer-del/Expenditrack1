import { Building2, BarChart3, LayoutGrid, Menu, Plus, Receipt } from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { useActivityLogQuery } from "@/hooks/useActivityLog"
import { useMessagesQuery } from "@/hooks/useMessages"
import { useAppStore } from "@/store/useAppStore"
import { useLastSeenStore } from "@/store/useLastSeenStore"
import { useMessagesLastSeenStore } from "@/store/useMessagesLastSeenStore"

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  /** Each destination gets its own color identity, same convention as the
   *  KPI tiles/vendor cards — makes the active pill instantly recognizable
   *  rather than every tab going the same generic primary blue. */
  color: string
}

export function MobileBottomNav() {
  const { user, isAdmin, can } = useAuth()
  const navigate = useNavigate()
  const activeDept = useAppStore((s) => s.activeDept)
  const activityLogQuery = useActivityLogQuery()
  const lastSeenTs = useLastSeenStore((s) => s.lastSeenTs)
  const unreadActivity = lastSeenTs > 0 ? (activityLogQuery.data ?? []).filter((e) => e.ts > lastSeenTs).length : 0

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

  const mainNav: NavItem[] = [
    { to: "/", label: "Dashboard", icon: LayoutGrid, color: "var(--chart-1)" },
    { to: "/invoices", label: "Invoices", icon: Receipt, color: "var(--chart-2)" },
    { to: "/vendors", label: "Vendors", icon: Building2, color: "var(--chart-3)" },
    { to: "/reports", label: "Reports", icon: BarChart3, color: "var(--chart-5)" },
  ]

  const moreNav = [
    ...(unreadActivity > 0 ? [{ to: "/activity", label: "Activity", badge: unreadActivity }] : []),
    ...(unreadMessages > 0 ? [{ to: "/messages", label: "Messages", badge: unreadMessages }] : []),
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm md:hidden dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center justify-around gap-1 px-2 py-2">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={item.label}
            className="flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors"
          >
            {({ isActive }) => (
              <>
                <div
                  className="flex size-9 items-center justify-center rounded-2xl transition-colors"
                  style={isActive ? { backgroundColor: `color-mix(in oklch, ${item.color} 18%, transparent)` } : undefined}
                >
                  <item.icon className="size-[19px]" style={{ color: isActive ? item.color : "var(--muted-foreground)" }} />
                </div>
                <span style={{ color: isActive ? item.color : "var(--muted-foreground)" }}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {can("add") && (
          <button
            type="button"
            title="New invoice"
            onClick={() => navigate("/invoices", { state: { openAdd: true } })}
            className="flex min-w-14 flex-col items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-muted-foreground"
          >
            <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform active:scale-90">
              <Plus className="size-[19px]" />
            </div>
            <span>New</span>
          </button>
        )}

        {moreNav.length > 0 && (
          <DropdownMenu>
            <Button variant="ghost" className="flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium" asChild>
              <div className="relative">
                <div className="flex size-9 items-center justify-center rounded-2xl">
                  <Menu className="size-[19px] text-muted-foreground" />
                </div>
                {moreNav.some((n) => n.badge) && (
                  <span className="absolute top-0 right-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
                )}
                <span className="text-muted-foreground">More</span>
              </div>
            </Button>
            <DropdownMenuContent align="end" side="top" className="w-48">
              {moreNav.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <NavLink to={item.to} className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                  </NavLink>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>More</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <NavLink to="/settings">Settings</NavLink>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <NavLink to="/users">Users</NavLink>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}
