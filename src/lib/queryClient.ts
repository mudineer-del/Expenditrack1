import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { QueryCache, QueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"

/** A query failing because the signed-in session is no longer accepted (PostgREST returns
 *  401 / PGRST301-302 for an expired or invalid JWT). */
function isAuthError(e: unknown): boolean {
  const err = e as { code?: string; message?: string; status?: number } | null
  if (!err) return false
  return err.status === 401 || err.code === "PGRST301" || err.code === "PGRST302" || /jwt|unauthori[sz]ed/i.test(err.message ?? "")
}

let lastRecovery = 0

/** Re-check the session once, then sign out if it can't be refreshed. Without this the page
 *  kept showing the last persisted copy of the data (up to 24h old) while every request
 *  failed with 401 — which looked like the database had the wrong numbers. */
async function recoverFromAuthError(): Promise<void> {
  if (Date.now() - lastRecovery < 30_000) return
  lastRecovery = Date.now()
  const { useAuthStore } = await import("@/store/useAuthStore")
  const { error } = await getSupabaseClient().auth.refreshSession()
  if (error) await useAuthStore.getState().signOut()
  else queryClient.invalidateQueries()
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAuthError(error)) void recoverFromAuthError()
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
})

export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "ogdcl:query-cache",
})
