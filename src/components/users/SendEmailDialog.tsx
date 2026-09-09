import { Mail } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/utils"
import { useSendEmail } from "@/hooks/useSendEmail"
import type { AppUser } from "@/types/user"

/** Admin-only compose dialog over the send-email Edge Function (AWS SES) — either
 *  opened locked to one teammate (the per-row "Email" button) or, when `allUsers` is
 *  given, as a general "Compose Email" letting the Admin pick any number of recipients
 *  from the account directory. Plain-text body only; the Edge Function wraps it as the
 *  email's text part and a simple <p>-per-line HTML part. */
export function SendEmailDialog({
  open,
  onOpenChange,
  fixedRecipient,
  allUsers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Locked, non-editable single recipient — set when opened from one user's row. */
  fixedRecipient?: AppUser
  /** Full picklist for the general "Compose Email" entry point — omit when using fixedRecipient. */
  allUsers?: AppUser[]
}) {
  const sendEmail = useSendEmail()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  useEffect(() => {
    if (!open) return
    setSubject("")
    setBody("")
    setSelected(fixedRecipient ? new Set([fixedRecipient.id]) : new Set())
  }, [open, fixedRecipient])

  const recipients = fixedRecipient ? [fixedRecipient] : (allUsers ?? []).filter((u) => selected.has(u.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSend() {
    if (!recipients.length || !subject.trim() || !body.trim()) return
    const html = body
      .split("\n")
      .map((line) => `<p>${line || "&nbsp;"}</p>`)
      .join("")
    sendEmail.mutate(
      { to: recipients.map((r) => r.email), subject: subject.trim(), html, text: body },
      {
        onSuccess: () => {
          toast.success(`Email sent to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}.`)
          onOpenChange(false)
        },
        onError: (e) => toast.error(errorMessage(e, "Could not send email.")),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Mail className="size-4" /> {fixedRecipient ? `Email ${fixedRecipient.name}` : "Compose Email"}
          </DialogTitle>
          <DialogDescription className="sr-only">Send an email through AWS SES</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {fixedRecipient ? (
            <div className="grid gap-1.5">
              <Label>To</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">{fixedRecipient.email}</div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label>To</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {(allUsers ?? []).map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0 hover:bg-muted">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="size-3.5 accent-primary" />
                    <span className="min-w-0 flex-1 truncate">
                      {u.name} <span className="text-muted-foreground">— {u.email}</span>
                    </span>
                  </label>
                ))}
              </div>
              {selected.size > 0 && (
                <p className="text-xs text-muted-foreground">{selected.size} recipient{selected.size !== 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="send-email-subject">Subject</Label>
            <Input id="send-email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus={!!fixedRecipient} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="send-email-body">Message</Label>
            <Textarea id="send-email-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSend} disabled={!recipients.length || !subject.trim() || !body.trim() || sendEmail.isPending}>
            {sendEmail.isPending ? "Sending…" : "Send"}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
