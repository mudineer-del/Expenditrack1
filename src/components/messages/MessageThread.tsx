import { Send, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/message"

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}
function fmtDayHeading(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Today"
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
}

export function MessageThread({
  title,
  subtitle,
  messages,
  meId,
  canModerate,
  onSend,
  onDelete,
  composerDisabled,
  composerDisabledHint,
}: {
  title: string
  subtitle?: string
  messages: Message[]
  meId: string
  canModerate: (m: Message) => boolean
  onSend: (body: string) => void
  onDelete: (m: Message) => void
  composerDisabled: boolean
  composerDisabledHint?: string
}) {
  const [text, setText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  function submit() {
    const body = text.trim()
    if (!body) return
    onSend(body)
    setText("")
  }

  let lastDay = ""
  let lastSender = ""

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No messages yet — say hello.
          </div>
        ) : (
          <div className="grid gap-3">
            {messages.map((m) => {
              const mine = m.senderId === meId
              const day = fmtDayHeading(m.createdAt)
              const showDay = day !== lastDay
              lastDay = day
              const showSender = showDay || m.senderId !== lastSender
              lastSender = m.senderId
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="my-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      {day}
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className={cn("group flex items-end gap-2", mine && "flex-row-reverse")}>
                    {showSender ? (
                      <Avatar size="sm" className="mb-0.5 shrink-0">
                        <AvatarFallback className="text-[10px]">{(m.senderName || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="size-6 shrink-0" />
                    )}
                    <div className={cn("flex max-w-[70%] flex-col gap-0.5", mine && "items-end")}>
                      {showSender && (
                        <span className="px-1 text-[11px] text-muted-foreground">
                          {mine ? "You" : m.senderName}
                          {m.senderRole ? ` · ${m.senderRole}` : ""} · {fmtTime(m.createdAt)}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {canModerate(m) && (
                          <button
                            type="button"
                            onClick={() => onDelete(m)}
                            title="Delete message"
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap",
                            mine ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        >
                          {m.body}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t p-3">
        {composerDisabled ? (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">{composerDisabledHint}</p>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
              className="min-h-10 flex-1 resize-none"
              rows={1}
            />
            <Button size="icon" onClick={submit} disabled={!text.trim()} title="Send">
              <Send />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
