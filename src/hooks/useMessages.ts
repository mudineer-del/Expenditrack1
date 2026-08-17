import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { fromMessageRow, type Message, type MessageRow } from "@/types/message"

export const MESSAGES_QUERY_KEY = ["messages"] as const
const MAX_MESSAGES = 500

async function fetchMessages(): Promise<Message[]> {
  const supabase = getSupabaseClient()
  // RLS already limits rows to channel posts + this user's own DMs (see
  // supabase/messages_setup.sql) — fetch newest-first up to the cap, then
  // reverse for natural oldest-to-newest chat order.
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_MESSAGES)
  if (error) throw error
  return ((data ?? []) as MessageRow[]).map(fromMessageRow).reverse()
}

/** Polls rather than using Supabase Realtime — keeps the Message Centre
 *  reasonably live without adding a whole new subscription/channel layer
 *  the rest of the app doesn't otherwise use. */
export function useMessagesQuery() {
  return useQuery({ queryKey: MESSAGES_QUERY_KEY, queryFn: fetchMessages, refetchInterval: 10000 })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (msg: { body: string; recipientId: string | null; department: string | null }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("messages").insert({
        body: msg.body,
        recipient_id: msg.recipientId,
        department: msg.department,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY }),
  })
}

export function useDeleteMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("messages").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY }),
  })
}
