import { LogOut, Settings, User } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { FormatDialog } from "@/components/shell/FormatDialog"
import { ThemeToggle } from "@/components/shell/ThemeToggle"
import { OgdclMark } from "@/components/shared/OgdclMark"
import { useAuth } from "@/hooks/useAuth"

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

export function AppShell() {
  const location = useLocation()
  const { user, signOut } = useAuth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <OgdclMark size="sm" className="hidden sm:flex" />
          <h1 className="text-base font-semibold">{pageTitle(location.pathname)}</h1>
          <div className="ml-auto flex items-center gap-1">
            <FormatDialog />
            <ThemeToggle />
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
                <DropdownMenuItem asChild>
                  <NavLink to="/settings">
                    <Settings /> Settings
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
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
