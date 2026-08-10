import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { ThemeProvider } from "next-themes"
import { useEffect, type ReactNode } from "react"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuthStore } from "@/store/useAuthStore"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
})

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "ogdcl:query-cache",
})

function AuthBootstrap() {
  useEffect(() => useAuthStore.getState().initialize(), [])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthBootstrap />
            {children}
            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}
