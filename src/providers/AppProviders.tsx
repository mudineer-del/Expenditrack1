import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { ThemeProvider } from "next-themes"
import { useEffect, type ReactNode } from "react"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { queryClient, queryPersister as persister } from "@/lib/queryClient"
import { useAuthStore } from "@/store/useAuthStore"

function AuthBootstrap() {
  useEffect(() => useAuthStore.getState().initialize(), [])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <TooltipProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthBootstrap />
            {children}
            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}
