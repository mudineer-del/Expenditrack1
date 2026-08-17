import { Building2, BarChart3, LayoutGrid, List, Menu, Plus } from "lucide-react"
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
  icon: React.ComponentType<{ className?: string }>
  badge?: number
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
    { to: "/", label: "Dashboard", icon: LayoutGrid },
    { to: "/invoices", label: "Invoices", icon: List },
    { to: "/vendors", label: "Vendors", icon: Building2 },
    { to: "/reports", label: "Reports", icon: BarChart3, badge: undefined },
  ]

  const moreNav = [
    ...(unreadActivity > 0 ? [{ to: "/activity", label: "Activity", icon: undefined, badge: unreadActivity }] : []),
    ...(unreadMessages > 0 ? [{ to: "/messages", label: "Messages", icon: undefined, badge: unreadMessages }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background">
      <div className="flex items-center justify-around gap-1 px-2 py-2">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
            title={item.label}
          >
            <item.icon className="size-5" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        {can("add") && (
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 rounded px-3 py-2 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground"
            title="New invoice"
            onClick={() => navigate("/invoices", { state: { openAdd: true } })}
          >
            <Plus className="size-5" />
            <span className="truncate text-[10px]">New</span>
          </Button>
        )}

        {moreNav.length > 0 && (
          <DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="flex flex-col items-center gap-1 rounded px-3 py-2 text-xs font-medium"
              asChild
            >
              <div className="relative">
                <Menu className="size-5" />
                {moreNav.some((n) => n.badge) && <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px]">•</Badge>}
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
