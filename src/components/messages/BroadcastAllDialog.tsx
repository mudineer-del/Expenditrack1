import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"

/** A single message posted with recipient_id AND department both null — visible to every
 *  signed-in user (messages_setup.sql's RLS already allows that for any channel post) and,
 *  since it carries no department, only ever surfaces under the "All Departments" merged
 *  channel view (MessageCentrePage's channelMessages filter), never mixed into any one
 *  department's own feed. That's what makes this a true one-shot broadcast rather than the
 *  existing "post into whichever department tab is active" channel composer. */
export function BroadcastAllDialog({
  open,
  onOpenChange,
  submitting,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting?: boolean
  onSend: (body: string) => void
}) {
  const [text, setText] = useState("")

  function handleOpenChange(v: boolean) {
    if (!v) setText("")
    onOpenChange(v)
  }

  function handleSend() {
    const body = text.trim()
    if (!body) return
    onSend(body)
    setText("")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message All Departments</DialogTitle>
          <DialogDescription>
            Sent once, visible to everyone on the team regardless of department — shows up under the "All
            Departments" channel view, not any single department's own feed.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Write an announcement… (Enter to send, Shift+Enter for a new line)"
          rows={4}
        />

        <DialogFooter>
          <Button onClick={handleSend} disabled={!text.trim() || submitting}>
            {submitting ? "Sending…" : "Send to All Departments"}
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
