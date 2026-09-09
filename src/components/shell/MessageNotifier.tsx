import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { MESSAGES_QUERY_KEY } from "@/hooks/useMessages"
import { useAuth } from "@/hooks/useAuth"
import { fromMessageRow, type MessageRow } from "@/types/message"

/** Instant, app-wide delivery for the Message Centre — a direct message to you, or any
 *  team channel post, pops up as a toast the moment it's sent while you're online
 *  (Supabase Realtime, not the 10-second poll useMessagesQuery() also keeps running as a
 *  fallback for reconnects). If you're not online, the poll/unread badge (AppSidebar,
 *  fed by the same query this invalidates) catches you up the next time you are — that
 *  half doesn't need its own code, it's just what the existing unread count already does
 *  once this pushes a fresh fetch. Suppressed while already viewing Message Centre, since
 *  the thread itself updates live there instead. Renders nothing. */
export function MessageNotifier() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  // The realtime subscription is set up once per login (see the effect's own deps
  // below) and must not tear down/reconnect on every navigation, so "are we currently
  // on Message Centre" is read from a ref updated each render instead of being a
  // dependency — closing over `location.pathname` directly would freeze it at whatever
  // route was active when the socket was opened.
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    if (!user) return
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = fromMessageRow(payload.new as MessageRow)
        // Refresh the query regardless of who sent it, so the sender's own thread view
        // and everyone else's unread badge both update live off this one push.
        queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY })

        // RLS already limited what reached this subscriber to channel posts + this
        // user's own DMs — this just skips the sender's own echo of their post, and
        // suppresses the toast while already viewing the thread it'd apply to.
        if (msg.senderId === user.id || pathRef.current === "/messages") return

        toast.message(msg.recipientId ? `New message from ${msg.senderName}` : `${msg.senderName} posted in the team channel`, {
          description: msg.body.length > 140 ? `${msg.body.slice(0, 140)}…` : msg.body,
          action: { label: "Open", onClick: () => navigate("/messages") },
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return null
}
