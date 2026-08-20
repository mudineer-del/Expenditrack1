import { Layers, LogOut, Search, Settings, User } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { QuickAddButton } from "@/components/shell/QuickAddButton"
import { ThemeToggle } from "@/components/shell/ThemeToggle"
import { MobileBottomNav } from "@/components/shell/MobileBottomNav"
import { InstallPrompt } from "@/components/shell/InstallPrompt"
import { OgdclLogoFull } from "@/components/shared/OgdclMark"
import { useAuth } from "@/hooks/useAuth"
import { useAppStore } from "@/store/useAppStore"
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore"

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/invoices": "Invoices",
  "/vendors": "Vendors & Contracts",
  "/reports": "Financial Reports",
  "/activity": "Activity Log",
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
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <OgdclLogoFull className="hidden h-8 w-auto rounded-none shadow-none sm:block" />
            <h1 className="text-base font-semibold">{pageTitle(location.pathname)}</h1>
            {isDeptScoped(location.pathname) && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                title="This page is scoped to the sidebar's active department"
              >
                <Layers className="size-3" />
                {activeDept === "ALL" ? "All Departments" : activeDept}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
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
            <Outlet />
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
