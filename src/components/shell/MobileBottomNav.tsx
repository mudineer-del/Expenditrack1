import { useEffect, useRef, useState } from "react"
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
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useActivityLogQuery } from "@/hooks/useActivityLog"
import { useMessagesQuery } from "@/hooks/useMessages"
import { useAppStore } from "@/store/useAppStore"
import { useLastSeenStore } from "@/store/useLastSeenStore"
import { useMessagesLastSeenStore } from "@/store/useMessagesLastSeenStore"

/** Hides the nav on scroll-down (past a small threshold, so it doesn't twitch right at
 *  the top) and brings it back on scroll-up. AppShell's <main> has overflow-auto in its
 *  class list, but on mobile nothing constrains its ancestors' height, so it never
 *  actually grows taller than its content — the page itself scrolls via the window
 *  instead, which is what this listens to. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const lastSource = useRef<EventTarget | null>(null)

  useEffect(() => {
    lastY.current = window.scrollY
    const main = document.querySelector("main")

    function onScroll(event: Event) {
      const source = event.currentTarget
      const y = source === window ? window.scrollY : (source as HTMLElement).scrollTop

      // Only one container normally scrolls, but resetting when ownership changes
      // prevents a jump when a responsive layout switches between window/main scroll.
      if (lastSource.current !== source) {
        lastSource.current = source
        lastY.current = y
        return
      }

      const delta = y - lastY.current
      if (y < 32) setHidden(false)
      else if (delta > 8) setHidden(true)
      else if (delta < -8) setHidden(false)
      lastY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    main?.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      main?.removeEventListener("scroll", onScroll)
    }
  }, [])

  return hidden
}

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
  const hidden = useHideOnScroll()
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
    { to: "/", label: "Dashboard", icon: LayoutGrid, color: "var(--primary)" },
    { to: "/invoices", label: "Invoices", icon: Receipt, color: "var(--primary)" },
    { to: "/vendors", label: "Vendors", icon: Building2, color: "var(--primary)" },
    { to: "/reports", label: "Reports", icon: BarChart3, color: "var(--primary)" },
  ]

  const moreNav = [
    ...(unreadActivity > 0 ? [{ to: "/activity", label: "Activity", badge: unreadActivity }] : []),
    ...(unreadMessages > 0 ? [{ to: "/messages", label: "Messages", badge: unreadMessages }] : []),
  ]

  return (
    <nav
      className={cn(
        "[perspective:800px] fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform duration-300 ease-in-out md:hidden dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center justify-around gap-1 px-2 py-2">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={item.label}
            className="flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-transform duration-150 ease-out active:translate-y-0.5"
          >
            {({ isActive }) => {
              const restColor = `color-mix(in oklch, ${item.color} 45%, var(--muted-foreground) 55%)`
              return (
                <>
                  <div
                    className={cn(
                      "flex size-10 origin-center transform-gpu items-center justify-center rounded-2xl transition-all duration-200 ease-out active:scale-90 active:shadow-none active:duration-100",
                      "active:translate-y-1",
                    )}
                    style={{
                      backgroundImage: isActive
                        ? `linear-gradient(155deg, color-mix(in oklch, ${item.color} 85%, white 25%), ${item.color})`
                        : `linear-gradient(155deg, color-mix(in oklch, ${item.color} 24%, var(--background) 76%), color-mix(in oklch, ${item.color} 12%, var(--background) 88%))`,
                      border: `1px solid color-mix(in oklch, ${item.color} ${isActive ? 70 : 35}%, transparent)`,
                      boxShadow: isActive
                        ? `0 5px 0 color-mix(in oklch, ${item.color} 38%, transparent), 0 8px 14px -7px color-mix(in oklch, ${item.color} 65%, transparent)`
                        : `0 4px 0 color-mix(in oklch, ${item.color} 18%, var(--border) 82%), 0 5px 10px -7px color-mix(in oklch, ${item.color} 35%, transparent)`,
                    }}
                  >
                    <item.icon className="size-5" style={{ color: isActive ? "white" : restColor }} />
                  </div>
                  <span className={isActive ? "font-bold" : undefined} style={{ color: isActive ? item.color : restColor }}>
                    {item.label}
                  </span>
                </>
              )
            }}
          </NavLink>
        ))}

        {can("add") && (
          <button
            type="button"
            title="New invoice"
            onClick={() => navigate("/invoices", { state: { openAdd: true } })}
            className="flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-transform duration-150 ease-out active:translate-y-0.5"
          >
            <div className="flex size-10 origin-center transform-gpu items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--primary)/0.45),0_8px_14px_-7px_hsl(var(--primary)/0.8)] transition-all duration-200 ease-out active:translate-y-1 active:scale-90 active:shadow-none active:duration-100">
              <Plus className="size-5" />
            </div>
            <span>New</span>
          </button>
        )}

        {moreNav.length > 0 && (
          <DropdownMenu>
            <Button variant="ghost" className="flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium" asChild>
              <div className="relative">
                <div className="flex size-10 origin-center transform-gpu items-center justify-center rounded-2xl border border-border bg-muted shadow-[0_4px_0_hsl(var(--border)),0_5px_10px_-7px_hsl(var(--foreground)/0.5)] transition-all duration-200 ease-out active:translate-y-1 active:scale-90 active:shadow-none active:duration-100">
                  <Menu className="size-5 text-muted-foreground" />
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
