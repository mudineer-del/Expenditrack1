import { Home, Layers, LogOut, Search, Settings, User } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/shell/AppSidebar"
import { CommandPalette } from "@/components/shell/CommandPalette"
import { FormatDialog } from "@/components/shell/FormatDialog"
import { NavIconChip } from "@/components/shell/NavIconChip"
import { QuickAddButton } from "@/components/shell/QuickAddButton"
import { ThemeToggle } from "@/components/shell/ThemeToggle"
import { MobileBottomNav } from "@/components/shell/MobileBottomNav"
import { InstallPrompt } from "@/components/shell/InstallPrompt"
import { OgdclLogoFull } from "@/components/shared/OgdclMark"
import { useAuth } from "@/hooks/useAuth"
import { NAV_ITEM_COLORS } from "@/lib/navColors"
import { useAppStore } from "@/store/useAppStore"
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore"

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/invoices": "Invoices",
  "/vendors": "Vendors & Contracts",
  "/reports": "Financial Reports",
  "/activity": "Audit Trail",
  "/users": "Users",
  "/settings": "Settings",
}

function pageTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.keys(TITLES).find((p) => p !== "/" && pathname.startsWith(p))
  return match ? TITLES[match] : "OGDCL Drilling Fluids Tracker"
}

// Pages whose data is scoped by the sidebar's active department — everything except
// Dashboard (which already shows its own department tab strip on-page) and the
// department-agnostic Users/Settings pages.
const DEPT_SCOPED_PATHS = ["/invoices", "/vendors", "/reports", "/activity"]

function isDeptScoped(pathname: string): boolean {
  return DEPT_SCOPED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function AppShell() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const activeDept = useAppStore((s) => s.activeDept)
  const openPalette = useCommandPaletteStore((s) => s.setOpen)
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Light, token-driven bar matching the sidebar surface — keeps the shell
              reading as one cohesive light frame instead of a dark stripe sitting
              on top of an otherwise light app. Adapts automatically with theme/dark
              mode since it rides --sidebar/--sidebar-border like AppSidebar does. */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <OgdclLogoFull className="hidden h-8 w-auto rounded-md shadow-none sm:block" />
            {/* min-w-0 matters: h1 is a flex item in a fixed-height (h-14) row
                with no explicit width — flex items default to min-width:auto,
                refusing to shrink below their own unwrapped text width, so a
                long title (e.g. "Vendors & Contracts") wrapped to multiple
                lines and overflowed the header's fixed height instead of
                truncating. Same root cause as the Dashboard grid overflow,
                just the flex-row flavor of it. */}
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold sm:flex-none">{pageTitle(location.pathname)}</h1>
            {isDeptScoped(location.pathname) && (
              // Hidden below sm — this badge and the h1 both wanted the same
              // shrinking flex space, and since it has no min-w-0 of its own
              // (just shrink-0 + a max-w cap), the *entire* squeeze landed on
              // the title instead, collapsing it to 0 width. The department
              // is already visible in the sidebar switcher, so this is
              // redundant context worth dropping on the narrowest screens
              // rather than fighting the title for room.
              <span
                className="hidden shrink-0 items-center gap-1.5 rounded-full bg-sidebar-accent px-2.5 py-1 text-xs font-medium text-sidebar-accent-foreground sm:inline-flex sm:max-w-40 lg:max-w-none"
                title="This page is scoped to the sidebar's active department"
              >
                <Layers className="size-3 shrink-0" />
                <span className="truncate">{activeDept === "ALL" ? "All Departments" : activeDept}</span>
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {location.pathname !== "/" && (
                <NavLink
                  to="/"
                  title="Back to Dashboard"
                  className="mr-1 transition-transform hover:scale-105 active:scale-95"
                >
                  <NavIconChip icon={Home} color={NAV_ITEM_COLORS["/"]} />
                </NavLink>
              )}
              <Button
                variant="outline"
                size="sm"
                className="hidden gap-2 text-muted-foreground sm:flex"
                onClick={() => openPalette(true)}
              >
                <Search className="size-3.5" />
                Search
                <kbd className="rounded border bg-muted px-1 text-[10px] font-medium">Ctrl K</kbd>
              </Button>
              <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => openPalette(true)} title="Search">
                <Search />
              </Button>
              <FormatDialog />
              <ThemeToggle />
              <Button variant="ghost" size="icon" asChild title="Settings" className="hidden sm:inline-flex">
                <NavLink to="/settings">
                  <Settings />
                </NavLink>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 outline-none hover:bg-muted">
                  <Avatar className="size-7">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                    <AvatarFallback className="text-xs">{user?.initials || "?"}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <p className="truncate">{user?.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user?.role}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/settings">
                      <User /> Profile
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 pb-24 md:pb-4">
            {/* Keyed by pathname so each page swap remounts this wrapper and
                replays the entrance animation — react-router doesn't animate
                route transitions on its own, so without this, navigating felt
                like an instant, jarring content swap instead of an app. */}
            <div key={location.pathname} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <CommandPalette />
        <QuickAddButton />
      </SidebarProvider>
      <MobileBottomNav />
      <InstallPrompt />
    </>
  )
}
