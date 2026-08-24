import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ConversationSidebar, type DmSummary, type Selection } from "@/components/messages/ConversationSidebar"
import { MessageThread } from "@/components/messages/MessageThread"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/utils"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAuth } from "@/hooks/useAuth"
import { useDeleteMessage, useMessagesQuery, useSendMessage } from "@/hooks/useMessages"
import { useProfilesQuery } from "@/hooks/useProfiles"
import { useAppStore } from "@/store/useAppStore"
import { useMessagesLastSeenStore } from "@/store/useMessagesLastSeenStore"
import type { Message } from "@/types/message"

const ALL_DEPARTMENTS = "ALL"

export default function MessageCentrePage() {
  const { user, isAdmin } = useAuth()
  const messagesQuery = useMessagesQuery()
  const profilesQuery = useProfilesQuery()
  const { ref: refLists } = useReferenceLists()
  const activeDept = useAppStore((s) => s.activeDept)
  const sendMessage = useSendMessage()
  const deleteMessage = useDeleteMessage()

  const lastSeenTs = useMessagesLastSeenStore((s) => s.lastSeenTs)
  const markSeen = useMessagesLastSeenStore((s) => s.markSeen)
  // Snapshot once on mount, same rationale as ActivityLogPage's sessionLastSeen —
  // the unread dots shouldn't vanish the instant markSeen() below updates the
  // store, only on the *next* visit.
  const [sessionLastSeen] = useState(lastSeenTs)
  useEffect(() => {
    if (messagesQuery.data) markSeen(Date.now())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesQuery.data])

  const messages = messagesQuery.data ?? []
  const directory = profilesQuery.data ?? []
  const meId = user?.id || ""

  const [selection, setSelection] = useState<Selection>({ type: "channel" })

  const channelMessages = useMemo(
    () => messages.filter((m) => m.recipientId === null && (activeDept === ALL_DEPARTMENTS || m.department === activeDept)),
    [messages, activeDept]
  )

  const dmSummaries = useMemo<DmSummary[]>(() => {
    const byOther = new Map<string, Message[]>()
    for (const m of messages) {
      if (m.recipientId === null) continue
      const otherId = m.senderId === meId ? m.recipientId : m.recipientId === meId ? m.senderId : null
      if (!otherId) continue
      const arr = byOther.get(otherId) ?? []
      arr.push(m)
      byOther.set(otherId, arr)
    }
    const list: DmSummary[] = []
    for (const [userId, arr] of byOther) {
      const last = arr[arr.length - 1]
      const unread = sessionLastSeen > 0 && arr.some((m) => m.senderId !== meId && m.createdAt > sessionLastSeen)
      list.push({ userId, lastBody: last.body, lastTs: last.createdAt, unread })
    }
    return list.sort((a, b) => b.lastTs - a.lastTs)
  }, [messages, meId, sessionLastSeen])

  const dmThreadMessages = useMemo(() => {
    if (selection.type !== "dm") return []
    return messages.filter(
      (m) =>
        m.recipientId !== null &&
        ((m.senderId === meId && m.recipientId === selection.userId) || (m.senderId === selection.userId && m.recipientId === meId))
    )
  }, [messages, selection, meId])

  function handleSend(body: string) {
    const payload =
      selection.type === "channel"
        ? { body, recipientId: null, department: activeDept === ALL_DEPARTMENTS ? refLists.departments[0] || null : activeDept }
        : { body, recipientId: selection.userId, department: null }
    sendMessage.mutate(payload, {
      onError: (e) => toast.error(errorMessage(e, "Could not send message.")),
    })
  }

  function handleDelete(m: Message) {
    deleteMessage.mutate(m.id, {
      onError: (e) => toast.error(errorMessage(e, "Could not delete message.")),
    })
  }

  function canModerate(m: Message) {
    return m.senderId === meId || isAdmin
  }

  if (messagesQuery.isLoading || profilesQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    )
  }

  if (messagesQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load the Message Centre. Run <code>supabase/messages_setup.sql</code> in your Supabase project's
        SQL Editor if you haven't yet, then reload.
      </div>
    )
  }

  const otherPerson = selection.type === "dm" ? directory.find((u) => u.id === selection.userId) : undefined

  return (
    <div className="flex h-[calc(100vh-5.5rem)] min-h-[28rem] overflow-hidden rounded-lg border bg-card">
      <ConversationSidebar
        activeDept={activeDept}
        selection={selection}
        onSelect={setSelection}
        dmSummaries={dmSummaries}
        directory={directory}
        meId={meId}
      />
      {selection.type === "channel" ? (
        <MessageThread
          title={activeDept === ALL_DEPARTMENTS ? "All departments" : `${activeDept} channel`}
          subtitle={
            activeDept === ALL_DEPARTMENTS
              ? "Every department's channel, merged — pick one department to post"
              : "Visible to everyone on the team"
          }
          messages={channelMessages}
          meId={meId}
          canModerate={canModerate}
          onSend={handleSend}
          onDelete={handleDelete}
          composerDisabled={activeDept === ALL_DEPARTMENTS}
          composerDisabledHint="Switch to a specific department (sidebar) to post in its channel."
        />
      ) : (
        <MessageThread
          title={otherPerson?.name || "Unknown user"}
          subtitle={otherPerson?.role ? `${otherPerson.role}${otherPerson.dept ? ` · ${otherPerson.dept}` : ""}` : undefined}
          messages={dmThreadMessages}
          meId={meId}
          canModerate={canModerate}
          onSend={handleSend}
          onDelete={handleDelete}
          composerDisabled={false}
        />
      )}
    </div>
  )
}
