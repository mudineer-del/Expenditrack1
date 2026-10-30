import { Check, Pencil, Plus, Trash2, Upload, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { parseImportFile } from "@/lib/invoiceIO"
import { parseAfeLines, parseHtmlMatrix } from "@/lib/wellAfeImport"
import { fmtCurrency } from "@/lib/wellCost"
import { errorMessage } from "@/lib/utils"
import {
  AFE_CURRENCIES,
  AFE_STATUSES,
  AFE_TYPES,
  blankWellAfe,
  blankWellAfeLine,
  wellAfeRate,
  wellAfeTotal,
  type WellAfe,
  type WellAfeLine,
} from "@/types/wellAfe"

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"

function numberOrBlank(v: string): number | "" {
  return v === "" ? "" : Number(v)
}

/** Authorization for Expenditure for one well: a list of its AFEs, and an editor for one
 *  AFE's header plus its cost lines. Clicking an AFE in the list opens its AFE page via
 *  onViewAfe. The editor works on a local draft and saves only on Save, Convert, or
 *  Revert, so a half-typed AFE never reaches the database. Converted values are saved
 *  with the AFE and stay on until reverted. */
export function WellAfeDialog({
  open,
  onOpenChange,
  wellId,
  wellName,
  afes,
  canEdit,
  canDelete,
  saving,
  initialAfeId,
  onSave,
  onDelete,
  onViewAfe,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  wellId: string
  wellName: string
  afes: WellAfe[]
  canEdit: boolean
  canDelete: boolean
  saving: boolean
  /** Open straight into the editor for this AFE, e.g. from the AFE page's Edit button. */
  initialAfeId?: string | null
  onSave: (afe: WellAfe) => Promise<void>
  onDelete: (afe: WellAfe) => Promise<void>
  /** Called when an AFE row is clicked, so the page can open that AFE. */
  onViewAfe?: (afe: WellAfe) => void
}) {
  const [draft, setDraft] = useState<WellAfe | null>(() => {
    const start = initialAfeId ? afes.find((a) => a.id === initialAfeId) : undefined
    return start ? structuredClone(start) : null
  })
  const [error, setError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<WellAfe | null>(null)
  const [importing, setImporting] = useState(false)
  /** Cost lines currently open for editing, keyed by line id. The value is the line as it
   *  was before editing, so Cancel can restore it; null marks a line added in this session. */
  const [editingLines, setEditingLines] = useState<Record<string, WellAfeLine | null>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Opening or closing a different AFE's editor drops any row still in edit mode.
  useEffect(() => {
    setEditingLines({})
  }, [draft?.id])

  /** Appends the file's cost lines to the draft. The untouched blank line a new AFE starts
   *  with is dropped, so an import into a new AFE doesn't leave an empty row at the top. */
  async function handleImport(file: File) {
    setImporting(true)
    try {
      const isHtml = /\.html?$/i.test(file.name)
      const matrix = isHtml ? parseHtmlMatrix(await file.text()) : await parseImportFile(file)
      const { lines, error: parseError } = parseAfeLines(matrix)
      if (parseError) return setError(parseError)
      setDraft((d) =>
        d
          ? {
              ...d,
              lines: [...d.lines.filter((l) => l.code || l.description || l.estimate !== ""), ...lines],
            }
          : d
      )
      setError("")
      toast.success(`Imported ${lines.length} cost line${lines.length === 1 ? "" : "s"} from ${file.name}.`)
    } catch (e) {
      setError(errorMessage(e, "Could not read that file."))
    } finally {
      setImporting(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDraft(null)
      setError("")
    }
    onOpenChange(next)
  }

  function update<K extends keyof WellAfe>(key: K, value: WellAfe[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  function updateLine(id: string, patch: Partial<WellAfeLine>) {
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : d))
  }

  function addLine() {
    const line = blankWellAfeLine()
    setDraft((d) => (d ? { ...d, lines: [...d.lines, line] } : d))
    setEditingLines((m) => ({ ...m, [line.id]: null }))
  }

  function startEditLine(line: WellAfeLine) {
    setEditingLines((m) => ({ ...m, [line.id]: { ...line } }))
  }

  function saveLine(id: string) {
    setEditingLines((m) => {
      const next = { ...m }
      delete next[id]
      return next
    })
  }

  /** Restores a line to how it was before editing. A line added in this session has no
   *  earlier version, so cancelling it removes it. */
  function cancelLine(id: string) {
    const before = editingLines[id]
    if (before === null) return removeLine(id)
    if (before) setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === id ? before : l)) } : d))
    saveLine(id)
  }

  function removeLine(id: string) {
    setDraft((d) => (d ? { ...d, lines: d.lines.filter((l) => l.id !== id) } : d))
    saveLine(id)
  }

  /** Checks an AFE and saves it. Returns false, with the reason in the error line, when it
   *  can't be saved. Save, Convert and Revert all go through here. */
  async function persist(next: WellAfe): Promise<boolean> {
    const afeNo = next.afeNo.trim()
    if (!afeNo) {
      setError("AFE number is required.")
      return false
    }
    if (afes.some((a) => a.id !== next.id && a.afeNo.trim().toLowerCase() === afeNo.toLowerCase())) {
      setError(`This well already has an AFE numbered ${afeNo}.`)
      return false
    }
    if (Object.keys(editingLines).length > 0) {
      setError("Save or cancel the cost line you are editing first.")
      return false
    }
    setError("")
    try {
      await onSave({ ...next, afeNo })
      return true
    } catch {
      // The page's mutation shows the error toast; the draft stays open so nothing is lost.
      return false
    }
  }

  async function handleSave() {
    if (!draft) return
    if (await persist(draft)) setDraft(null)
  }

  /** Converts and saves, so the converted values are still there the next time the AFE is
   *  opened. Converting a line that's in edit mode is refused, same as Save. */
  async function handleConvert() {
    if (!draft) return
    if (wellAfeRate(draft) <= 0) {
      setError(`Enter a conversion rate above 0 (1 ${draft.currency} = ? ${draft.preferredCurrency}).`)
      return
    }
    const next = { ...draft, converted: true }
    if (await persist(next)) setDraft(next)
  }

  /** Turns the converted values off and saves that, the only way they go away. */
  async function handleRevert() {
    if (!draft) return
    const next = { ...draft, converted: false }
    if (await persist(next)) setDraft(next)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await onDelete(deleteTarget)
    } finally {
      setDeleteTarget(null)
    }
  }

  const editing = draft !== null
  const isSaved = draft ? afes.some((a) => a.id === draft.id) : false
  const total = draft ? wellAfeTotal(draft) : 0
  const estimateTotal = draft ? draft.lines.reduce((s, l) => s + (Number(l.estimate) || 0), 0) : 0
  const contingencyTotal = draft ? draft.lines.reduce((s, l) => s + (Number(l.contingency) || 0), 0) : 0
  /** Units of the preferred currency per unit of the AFE currency. Same currency means 1. */
  const rate = draft ? wellAfeRate(draft) : 0
  const converted = !!draft?.converted && rate > 0
  const convertedTotal = total * rate

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Labels, section headings and column headers take the theme's primary colour, so
            every piece of text in this dialog follows the app's chosen theme. */}
        <DialogContent className="max-h-[90vh] overflow-y-auto text-primary sm:max-w-5xl [&_label]:text-primary [&_h4]:text-primary [&_th]:text-primary">
          <DialogHeader>
            <DialogTitle>{draft ? (isSaved ? `Edit AFE ${draft.afeNo}` : "New AFE") : "Authorization for Expenditure"}</DialogTitle>
            <DialogDescription>
              {wellName ? `${wellName}. ` : ""}
              {editing
                ? "Header details, then one line per WBS code. Nothing is saved until you press Save AFE, Convert or Revert."
                : "Every AFE raised against this well. Click an AFE to open its page. The total is estimate plus contingency across its lines."}
            </DialogDescription>
          </DialogHeader>

          {!editing && (
            <div className="grid gap-4">
              {canEdit && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setDraft(blankWellAfe(wellId))}>
                    <Plus /> New AFE
                  </Button>
                </div>
              )}
              {afes.length === 0 ? (
                <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No AFEs raised for this well yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>AFE No.</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Lines</TableHead>
                        <TableHead className="text-right">Total (AFE currency)</TableHead>
                        <TableHead className="text-right">Total (preferred)</TableHead>
                        <TableHead className="text-right">Limit</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {afes.map((a) => {
                        const aRate = wellAfeRate(a)
                        const aTotal = wellAfeTotal(a)
                        const showAfeConverted = a.converted && aRate > 0
                        return (
                          <TableRow key={a.id} className={onViewAfe ? "cursor-pointer" : undefined} onClick={() => onViewAfe?.(a)}>
                            <TableCell className="font-medium text-primary">{a.afeNo}</TableCell>
                            <TableCell>{a.afeType}</TableCell>
                            <TableCell>{a.status}</TableCell>
                            <TableCell className="text-right tabular-nums">{a.lines.length}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(aTotal, a.currency)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {showAfeConverted ? fmtCurrency(aTotal * aRate, a.preferredCurrency) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {a.approvalLimit === "" ? "—" : fmtCurrency(a.approvalLimit, a.currency)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Edit AFE"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDraft(structuredClone(a))
                                    }}
                                  >
                                    <Pencil />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Delete AFE"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteTarget(a)
                                    }}
                                  >
                                    <Trash2 />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {editing && draft && (
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-no">AFE number</Label>
                  <Input id="afe-no" value={draft.afeNo} disabled={!canEdit} onChange={(e) => update("afeNo", e.target.value)} placeholder="AFE-2026-014" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-type">Type</Label>
                  <select id="afe-type" className={selectClass} value={draft.afeType} disabled={!canEdit} onChange={(e) => update("afeType", e.target.value)}>
                    {AFE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-status">Status</Label>
                  <select id="afe-status" className={selectClass} value={draft.status} disabled={!canEdit} onChange={(e) => update("status", e.target.value)}>
                    {AFE_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-limit">Approval limit ({draft.currency})</Label>
                  <Input
                    id="afe-limit"
                    type="number"
                    min={0}
                    value={draft.approvalLimit}
                    disabled={!canEdit}
                    onChange={(e) => update("approvalLimit", numberOrBlank(e.target.value))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-prepared">Prepared on</Label>
                  <Input id="afe-prepared" type="date" value={draft.preparedOn} disabled={!canEdit} onChange={(e) => update("preparedOn", e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-approved">Approved on</Label>
                  <Input id="afe-approved" type="date" value={draft.approvedOn} disabled={!canEdit} onChange={(e) => update("approvedOn", e.target.value)} />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label htmlFor="afe-notes">Notes</Label>
                  <Input id="afe-notes" value={draft.notes} disabled={!canEdit} onChange={(e) => update("notes", e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-5">
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-currency">AFE currency</Label>
                  <select id="afe-currency" className={selectClass} value={draft.currency} disabled={!canEdit} onChange={(e) => update("currency", e.target.value)}>
                    {AFE_CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-preferred">Preferred currency</Label>
                  <select
                    id="afe-preferred"
                    className={selectClass}
                    value={draft.preferredCurrency}
                    disabled={!canEdit}
                    onChange={(e) => update("preferredCurrency", e.target.value)}
                  >
                    {AFE_CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="afe-rate">
                    Conversion rate (1 {draft.currency} = ? {draft.preferredCurrency})
                  </Label>
                  <Input
                    id="afe-rate"
                    type="number"
                    min={0}
                    step="any"
                    value={draft.currency === draft.preferredCurrency ? 1 : draft.conversionRate}
                    disabled={!canEdit || draft.currency === draft.preferredCurrency}
                    onChange={(e) => update("conversionRate", numberOrBlank(e.target.value))}
                    placeholder="e.g. 0.0036"
                  />
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  {canEdit && (
                    <Button variant="outline" disabled={saving} onClick={handleConvert}>
                      Convert to {draft.preferredCurrency}
                    </Button>
                  )}
                  {canEdit && draft.converted && (
                    <Button variant="ghost" disabled={saving} onClick={handleRevert}>
                      Revert conversion
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Cost lines</h4>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                        <Upload /> {importing ? "Reading file…" : "Import"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.htm,.html"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ""
                          if (file) handleImport(file)
                        }}
                      />
                      <Button variant="outline" size="sm" onClick={addLine}>
                        <Plus /> Add line
                      </Button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">WBS Code</TableHead>
                        <TableHead className="min-w-64">Description</TableHead>
                        <TableHead className="w-36 text-right">Estimate</TableHead>
                        <TableHead className="w-36 text-right">Contingency</TableHead>
                        {converted && <TableHead className="w-40 text-right">Total ({draft.preferredCurrency})</TableHead>}
                        {canEdit && <TableHead className="w-28 text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.lines.map((l) => {
                        const isEditing = l.id in editingLines
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <Input className="min-w-72" value={l.code} onChange={(e) => updateLine(l.id, { code: e.target.value })} aria-label="WBS code" />
                              ) : (
                                <span className="font-mono text-sm">{l.code || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              {isEditing ? (
                                <Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} aria-label="Description" />
                              ) : (
                                l.description || "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min={0}
                                  className="text-right tabular-nums"
                                  value={l.estimate}
                                  onChange={(e) => updateLine(l.id, { estimate: numberOrBlank(e.target.value) })}
                                  aria-label="Estimate"
                                />
                              ) : l.estimate === "" ? (
                                "—"
                              ) : (
                                fmtCurrency(l.estimate, draft.currency, 2)
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min={0}
                                  className="text-right tabular-nums"
                                  value={l.contingency}
                                  onChange={(e) => updateLine(l.id, { contingency: numberOrBlank(e.target.value) })}
                                  aria-label="Contingency"
                                />
                              ) : l.contingency === "" ? (
                                "—"
                              ) : (
                                fmtCurrency(l.contingency, draft.currency, 2)
                              )}
                            </TableCell>
                            {converted && (
                              <TableCell className="text-right tabular-nums">
                                {fmtCurrency(((Number(l.estimate) || 0) + (Number(l.contingency) || 0)) * rate, draft.preferredCurrency, 2)}
                              </TableCell>
                            )}
                            {canEdit && (
                              <TableCell>
                                <div className="flex justify-end gap-1">
                                  {isEditing ? (
                                    <>
                                      <Button variant="ghost" size="icon" title="Save line" onClick={() => saveLine(l.id)}>
                                        <Check />
                                      </Button>
                                      <Button variant="ghost" size="icon" title="Cancel edit" onClick={() => cancelLine(l.id)}>
                                        <X />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button variant="ghost" size="icon" title="Edit line" onClick={() => startEditLine(l)}>
                                      <Pencil />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" title="Delete line" onClick={() => removeLine(l.id)}>
                                    <Trash2 />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                      <TableRow className="font-semibold text-primary">
                        <TableCell colSpan={2} className="text-right">
                          Totals ({draft.currency})
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtCurrency(estimateTotal, draft.currency)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtCurrency(contingencyTotal, draft.currency)}</TableCell>
                        {converted && (
                          <TableCell className="text-right tabular-nums">{fmtCurrency(convertedTotal, draft.preferredCurrency)}</TableCell>
                        )}
                        {canEdit && <TableCell />}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <p className="text-sm text-primary">
                <span className="font-semibold">Total AFE: {fmtCurrency(total, draft.currency)}</span>
                {converted && (
                  <span className="text-muted-foreground">
                    {" "}
                    = {fmtCurrency(convertedTotal, draft.preferredCurrency)} at 1 {draft.currency} = {rate} {draft.preferredCurrency}
                  </span>
                )}
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {editing ? (
              <>
                <Button variant="outline" disabled={saving} onClick={() => setDraft(null)}>
                  Back
                </Button>
                {canEdit && (
                  <Button disabled={saving} onClick={handleSave}>
                    {saving ? "Saving…" : "Save AFE"}
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this AFE?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `AFE ${deleteTarget.afeNo} and its ${deleteTarget.lines.length} cost lines will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
