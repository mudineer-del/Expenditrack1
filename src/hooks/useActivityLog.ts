import type { QueryClient } from "@tanstack/react-query"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import type { ActivityAction, ActivityEntry, ActivityMeta } from "@/store/useActivityStore"

export const ACTIVITY_LOG_QUERY_KEY = ["activityLog"] as const
const MAX_LOG = 300

interface ActivityLogRow {
  id: string
  ts: string
  user_name: string
  user_role: string
  action: ActivityAction
  detail: string
  meta: ActivityMeta | null
}

function fromRow(row: ActivityLogRow): ActivityEntry {
  return {
    id: row.id,
    ts: new Date(row.ts).getTime(),
    user: row.user_name || "Unknown",
    role: row.user_role || "",
    action: row.action,
    detail: row.detail,
    meta: row.meta,
  }
}

async function fetchActivityLog(): Promise<ActivityEntry[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("ts", { ascending: false })
    .limit(MAX_LOG)
  if (error) throw error
  return ((data ?? []) as ActivityLogRow[]).map(fromRow)
}

/** Shared, cross-device activity log (see supabase/activity_log_setup.sql) — replaces the old per-browser localStorage log. */
export function useActivityLogQuery() {
  return useQuery({ queryKey: ACTIVITY_LOG_QUERY_KEY, queryFn: fetchActivityLog })
}

/**
 * Imperative insert, for use inside other mutations (invoice add/edit/delete,
 * undo, restore) rather than as its own hook — mirrors the old
 * useActivityStore.getState().logActivity() call sites, just async now.
 * Failing to log an action shouldn't fail the action itself, so this
 * swallows errors (e.g. the migration not having been run yet) after
 * warning.
 */
export async function logActivity(
  queryClient: QueryClient,
  actor: { name: string; role: string },
  action: ActivityAction,
  detail: string,
  meta?: ActivityMeta
) {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("activity_log").insert({
      user_name: actor.name,
      user_role: actor.role,
      action,
      detail,
      meta: meta ?? null,
    })
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: ACTIVITY_LOG_QUERY_KEY })
  } catch (e) {
    console.warn("Could not record activity log entry (has supabase/activity_log_setup.sql been run?):", e)
  }
}

/** Admin-only (enforced by RLS) — wipes the whole team's shared history, not just the local view. */
export function useClearActivityLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("activity_log").delete().gte("ts", "1900-01-01")
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACTIVITY_LOG_QUERY_KEY }),
  })
}
