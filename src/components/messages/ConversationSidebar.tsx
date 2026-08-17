import { Hash, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { AppUser } from "@/types/user"

export type Selection = { type: "channel" } | { type: "dm"; userId: string }

function fmtShortTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export interface DmSummary {
  userId: string
  lastBody: string
  lastTs: number
  unread: boolean
}

export function ConversationSidebar({
  activeDept,
  selection,
  onSelect,
  dmSummaries,
  directory,
  meId,
}: {
  activeDept: string
  selection: Selection
  onSelect: (s: Selection) => void
  dmSummaries: DmSummary[]
  directory: AppUser[]
  meId: string
}) {
  const [search, setSearch] = useState("")

  const byId = useMemo(() => new Map(directory.map((u) => [u.id, u])), [directory])
  const conversedIds = useMemo(() => new Set(dmSummaries.map((d) => d.userId)), [dmSummaries])
  const rest = useMemo(
    () =>
      directory.filter(
        (u) =>
          u.id !== meId &&
          !conversedIds.has(u.id) &&
          (!search.trim() || u.name.toLowerCase().includes(search.trim().toLowerCase()))
      ),
    [directory, meId, conversedIds, search]
  )

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r">
      <div className="border-b p-3">
        <button
          type="button"
          onClick={() => onSelect({ type: "channel" })}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
            selection.type === "channel" ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
          )}
        >
          <Hash className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{activeDept === "ALL" ? "All departments (read-only)" : `${activeDept} channel`}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2 pt-1 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Direct messages</p>
        {dmSummaries.length === 0 && rest.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No one else on the team yet.</p>
        )}
        <div className="grid gap-0.5">
          {dmSummaries.map((d) => {
            const person = byId.get(d.userId)
            const active = selection.type === "dm" && selection.userId === d.userId
            return (
              <button
                type="button"
                key={d.userId}
                onClick={() => onSelect({ type: "dm", userId: d.userId })}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  active ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback className="text-[10px]">{person?.initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-sm", d.unread && "font-semibold")}>{person?.name || "Unknown user"}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{fmtShortTime(d.lastTs)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("min-w-0 flex-1 truncate text-xs", d.unread ? "text-foreground" : "text-muted-foreground")}>
                      {d.lastBody}
                    </span>
                    {d.unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {directory.length > 1 && (
          <>
            <div className="relative mt-3 px-2">
              <Search className="pointer-events-none absolute top-1/2 left-4.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Start a new conversation…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="mt-1 grid gap-0.5">
              {rest.map((u) => (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => onSelect({ type: "dm", userId: u.id })}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="text-[10px]">{u.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{u.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
