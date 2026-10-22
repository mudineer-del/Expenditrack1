import type { WellCostTransaction } from "@/types/wellCost"
import type { WellDailyDepth } from "@/types/wellDailyDepth"

/** A field entry that could not reach Supabase (no signal, or the request failed on the
 *  network). Kept on this device until it uploads. Upserts are keyed by id, so a retry after
 *  a partly-completed upload cannot create a duplicate. */
export interface QueuedFieldEntry {
  id: string
  queuedAt: string
  transaction: WellCostTransaction
  depth: WellDailyDepth | null
}

const KEY = "ogdcl:field-queue"

export function loadFieldQueue(): QueuedFieldEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as QueuedFieldEntry[]) : []
  } catch {
    return []
  }
}

export function saveFieldQueue(queue: QueuedFieldEntry[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(queue))
  } catch {
    // Storage full or blocked: the entry stays in memory for this session only.
  }
}

/** True when a failed request looks like a connectivity problem, so the entry should be kept
 *  and retried rather than reported as rejected. */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true
  if (e instanceof TypeError) return true
  return /failed to fetch|network|fetch|timed? ?out|load failed/i.test((e as { message?: string } | null)?.message ?? "")
}
