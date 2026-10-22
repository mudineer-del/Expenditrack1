import { CloudOff, CloudUpload, Loader2, Save } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { useUpsertWellCostTransaction } from "@/hooks/useWellCostTransactions"
import { useWellCostCentresQuery } from "@/hooks/useWellCostCentres"
import { useUpsertWellDailyDepths } from "@/hooks/useWellDailyDepths"
import { useWellsQuery } from "@/hooks/useWells"
import { isNetworkError, loadFieldQueue, saveFieldQueue, type QueuedFieldEntry } from "@/lib/fieldQueue"
import { errorMessage } from "@/lib/utils"
import { blankWellCostTransaction } from "@/types/wellCost"
import type { WellDailyDepth } from "@/types/wellDailyDepth"

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date, which is a day
 *  behind for entries made early in the morning in Pakistan). */
function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Field entry for the rig: one day's cost against a cost centre, plus the depth reached
 *  that day. Works offline — an entry that can't reach the database is kept on this device
 *  and uploads when the connection returns. Editors and Admins only. */
export default function WellFieldEntryPage() {
  const { can, user } = useAuth()
  const canEnter = can("add", "wellCostEntry")
  const wellsQuery = useWellsQuery()
  const centresQuery = useWellCostCentresQuery()
  const saveTransaction = useUpsertWellCostTransaction()
  const saveDepth = useUpsertWellDailyDepths()

  const wells = (wellsQuery.data ?? []).filter((w) => !w.archived)
  const [wellPick, setWellPick] = useState("")
  const wellId = wells.some((w) => w.id === wellPick) ? wellPick : wells[0]?.id ?? ""
  const centres = (centresQuery.data ?? []).filter((c) => c.wellId === wellId)

  const [costCentreId, setCostCentreId] = useState("")
  const [date, setDate] = useState(todayIso)
  const [amount, setAmount] = useState("")
  const [remarks, setRemarks] = useState("")
  const [depthMd, setDepthMd] = useState("")
  const [depthTvd, setDepthTvd] = useState("")
  const [saving, setSaving] = useState(false)
  const [queue, setQueue] = useState<QueuedFieldEntry[]>(loadFieldQueue)
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true))

  // Refs keep the flush loop on the latest mutations without re-running the effect below.
  const saveTransactionRef = useRef(saveTransaction)
  const saveDepthRef = useRef(saveDepth)
  saveTransactionRef.current = saveTransaction
  saveDepthRef.current = saveDepth
  const flushing = useRef(false)

  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return
    flushing.current = true
    try {
      for (const item of loadFieldQueue()) {
        try {
          await saveTransactionRef.current.mutateAsync(item.transaction)
          if (item.depth) await saveDepthRef.current.mutateAsync([item.depth])
        } catch (e) {
          // Stop at the first failure so entries upload in the order they were made.
          if (!isNetworkError(e)) toast.error(`Queued entry for ${item.transaction.entryDate} was rejected: ${errorMessage(e, "unknown error")}`)
          break
        }
        const remaining = loadFieldQueue().filter((q) => q.id !== item.id)
        saveFieldQueue(remaining)
        setQueue(remaining)
      }
    } finally {
      flushing.current = false
    }
  }, [])

  useEffect(() => {
    const up = () => {
      setOnline(true)
      void flush()
    }
    const down = () => setOnline(false)
    // The browser's "online" event is unreliable on some Windows and mobile setups, so the
    // queue also retries when the page regains focus or becomes visible again.
    const again = () => {
      if (document.visibilityState === "visible") void flush()
    }
    window.addEventListener("online", up)
    window.addEventListener("offline", down)
    window.addEventListener("focus", again)
    document.addEventListener("visibilitychange", again)
    void flush()
    return () => {
      window.removeEventListener("online", up)
      window.removeEventListener("offline", down)
      window.removeEventListener("focus", again)
      document.removeEventListener("visibilitychange", again)
    }
  }, [flush])

  // While entries are waiting, retry on a timer as well, so a dropped signal that comes back
  // without any event still uploads without the user doing anything.
  useEffect(() => {
    if (!queue.length) return
    const id = window.setInterval(() => void flush(), 30_000)
    return () => window.clearInterval(id)
  }, [queue.length, flush])

  function enqueue(entry: QueuedFieldEntry) {
    const next = [...loadFieldQueue(), entry]
    saveFieldQueue(next)
    setQueue(next)
  }

  function resetForm() {
    setAmount("")
    setRemarks("")
    setDepthMd("")
    setDepthTvd("")
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!costCentreId) return toast.error("Choose a cost centre")
    if (!(amt > 0)) return toast.error("Enter the day's amount")
    const md = depthMd === "" ? null : Number(depthMd)
    if (md !== null && !Number.isFinite(md)) return toast.error("Depth must be a number")

    const transaction = {
      ...blankWellCostTransaction(costCentreId, "actual", user?.name || ""),
      entryDate: date,
      amount: amt,
      notes: "Field entry",
      remarks: remarks.trim(),
    }
    const depth: WellDailyDepth | null =
      md === null ? null : { wellId, entryDate: date, depthMd: md, depthTvd: depthTvd === "" ? md : Number(depthTvd), source: "manual" }
    const entry: QueuedFieldEntry = { id: transaction.id, queuedAt: new Date().toISOString(), transaction, depth }

    if (!navigator.onLine) {
      enqueue(entry)
      resetForm()
      return toast.message("Saved on this device. It will upload when the connection returns.")
    }

    setSaving(true)
    try {
      await saveTransaction.mutateAsync(transaction)
      // The cost is saved, so the form resets before the depth write. If the depth write
      // fails, the form must not still hold this entry, or a resubmit would post the cost twice.
      resetForm()
      toast.success(`Saved ${amt.toLocaleString()} for ${date}.`)
      if (depth) {
        try {
          await saveDepth.mutateAsync([depth])
        } catch (depthErr) {
          toast.warning(`Cost saved, but depth was not: ${errorMessage(depthErr, "unknown error")}`)
        }
      }
    } catch (err) {
      if (isNetworkError(err)) {
        enqueue(entry)
        resetForm()
        toast.message("Connection dropped. Saved on this device; it will upload automatically.")
      } else {
        toast.error(errorMessage(err, "Could not save this entry."))
      }
    } finally {
      setSaving(false)
    }
  }

  if (!canEnter) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Only Editors and Admins can enter field costs.
      </div>
    )
  }

  const wellName = wells.find((w) => w.id === wellId)?.name ?? ""

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Field entry</h2>
          <p className="text-xs text-muted-foreground">{wellName || "No well selected"}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {online ? <CloudUpload className="size-4" /> : <CloudOff className="size-4" />}
          {online ? "Online" : "Offline"}
        </span>
      </div>

      {queue.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-status-under/40 bg-status-under/5 p-3 text-sm">
          <span>
            {queue.length} entr{queue.length === 1 ? "y" : "ies"} waiting to upload from this device. Retrying every 30 seconds while this page is open.
          </span>
          <Button size="sm" variant="outline" onClick={() => void flush()} disabled={!online}>
            Upload now
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-1.5">
          <Label htmlFor="field-well">Well</Label>
          <select
            id="field-well"
            className="h-12 rounded-md border bg-background px-3 text-base"
            value={wellId}
            onChange={(e) => {
              setWellPick(e.target.value)
              setCostCentreId("")
            }}
          >
            {wells.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="field-date">Date</Label>
          <Input id="field-date" type="date" className="h-12 text-base" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="field-centre">Cost centre</Label>
          <select
            id="field-centre"
            className="h-12 rounded-md border bg-background px-3 text-base"
            value={costCentreId}
            onChange={(e) => setCostCentreId(e.target.value)}
          >
            <option value="">Choose…</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.costCentre}
                {c.vendor ? ` — ${c.vendor}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="field-amount">Amount for the day</Label>
          <Input
            id="field-amount"
            inputMode="decimal"
            placeholder="0.00"
            className="h-12 text-base tabular-nums"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="field-md">Depth MD (m)</Label>
            <Input id="field-md" inputMode="decimal" className="h-12 text-base tabular-nums" value={depthMd} onChange={(e) => setDepthMd(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="field-tvd">Depth TVD (m)</Label>
            <Input
              id="field-tvd"
              inputMode="decimal"
              placeholder="same as MD"
              className="h-12 text-base tabular-nums"
              value={depthTvd}
              onChange={(e) => setDepthTvd(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="field-remarks">Remarks (optional)</Label>
          <textarea
            id="field-remarks"
            rows={3}
            className="rounded-md border bg-background px-3 py-2 text-base"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" className="h-12 text-base" disabled={saving || !wells.length}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} {saving ? "Saving…" : "Save entry"}
        </Button>
        {!online && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CloudOff className="size-3.5" /> You're offline. Entries are saved on this device and upload when you're back online.
          </p>
        )}
      </form>
    </div>
  )
}
