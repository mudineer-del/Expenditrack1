import "./invoice-dialog-designs.css"
import { useDialogPrefsStore } from "@/store/useDialogPrefsStore"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { fmtMoney } from "@/lib/dashboard"
import { blankInvoice, type Invoice } from "@/types/invoice"
import type { ReferenceLists } from "@/lib/referenceLists"
import { DuplicateDetectionWarning } from "@/components/invoices/DuplicateDetectionWarning"
import { InvoiceTemplateSelector } from "@/components/invoices/InvoiceTemplateSelector"
import { SaveAsTemplateButton } from "@/components/invoices/SaveAsTemplateButton"
import { detectDuplicates } from "@/lib/duplicateDetection"
import { useInvoiceUndoRedoStore } from "@/store/useInvoiceUndoRedoStore"
import { useInvoicesQuery } from "@/hooks/useInvoices"

const schema = z.object({
  srNo: z.coerce.number().int().min(1, "Required"),
  vendor: z.string().min(1, "Required"),
  invoiceNo: z.string().min(1, "Required"),
  contractNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  receivingDate: z.string().optional(),
  clearanceDate: z.string().optional(),
  loginDate: z.string().optional(),
  service: z.string().optional(),
  type: z.string().optional(),
  department: z.string().optional(),
  region: z.string().optional(),
  rig: z.string().optional(),
  location: z.string().optional(),
  wellName: z.string().optional(),
  serviceMonth: z.string().optional(),
  qtr: z.string().optional(),
  year: z.coerce.number().optional(),
  status: z.string().min(1, "Required"),
  description: z.string().optional(),
  amountExclTax: z.coerce.number().min(0),
  gstPst: z.coerce.number().min(0).max(1, "That's over 100% — check the rate."),
  amountPaid: z.coerce.number().min(0),
})

type FormInput = z.input<typeof schema>
type Values = z.output<typeof schema>

function toDateInput(d: string | null | undefined): string {
  if (!d) return ""
  return String(d).slice(0, 10)
}

function toValues(inv: Invoice, nextSrNo?: number, defaultDept?: string): FormInput {
  return {
    srNo: Number(inv.srNo) || nextSrNo || 0,
    vendor: inv.vendor,
    invoiceNo: inv.invoiceNo,
    contractNo: inv.contractNo,
    invoiceDate: toDateInput(inv.invoiceDate),
    receivingDate: toDateInput(inv.receivingDate),
    clearanceDate: toDateInput(inv.clearanceDate),
    loginDate: toDateInput(inv.loginDate),
    service: inv.service,
    type: inv.type,
    department: inv.department || defaultDept || "",
    region: inv.region,
    rig: inv.rig,
    location: inv.location,
    wellName: inv.wellName,
    serviceMonth: inv.serviceMonth,
    qtr: inv.qtr,
    year: inv.year ? Number(inv.year) : undefined,
    status: inv.status || "Under Process",
    description: inv.description,
    amountExclTax: Number(inv.amountExclTax) || 0,
    gstPst: inv.gstPst === "" ? 0.15 : Number(inv.gstPst),
    amountPaid: Number(inv.amountPaid) || 0,
  }
}

function SelectField({
  name,
  label,
  options,
  optionLabels,
  form,
  disabled,
  placeholder = "Select…",
}: {
  name: keyof FormInput
  label: string
  options: string[]
  /** Optional value -> display label override, e.g. a Contract No. shown as "No. — Vendor". */
  optionLabels?: Record<string, string>
  form: ReturnType<typeof useForm<FormInput, unknown, Values>>
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            disabled={disabled}
            value={String(field.value ?? "")}
            onValueChange={field.onChange}
          >
            <FormControl>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder={placeholder} className="block min-w-0 truncate" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {optionLabels?.[o] ?? o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function InvoiceDrawer({
  open,
  mode,
  invoice,
  nextSrNo,
  refLists,
  contractNumbers,
  contractLabels,
  contractVendorMap,
  defaultDept,
  canEdit,
  onOpenChange,
  onSubmit,
  onSwitchToEdit,
}: {
  open: boolean
  mode: "add" | "edit" | "view"
  invoice: Invoice | null
  /** Suggested Sr. No. for a brand-new invoice — last existing Sr. No. + 1, kept current by the caller. */
  nextSrNo?: number
  refLists: ReferenceLists
  contractNumbers: string[]
  /** Contract No. -> "No. — Vendor" display label, so it's clear who each contract belongs to. */
  contractLabels: Record<string, string>
  /** Contract No. -> vendor, used to narrow the Contract No. dropdown down to whichever
   *  vendor is currently selected. */
  contractVendorMap: Record<string, string>
  /** Department to pre-select for a brand-new invoice — the sidebar/dashboard's active
   *  department, so switching there means one less field to fill in on every add. */
  defaultDept?: string
  canEdit: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Invoice) => void
  onSwitchToEdit: () => void
}) {
  const design = useDialogPrefsStore((s) => s.design)
  const [section, setSection] = useState(0)
  const [maximized, setMaximized] = useState(false)
  const paged = design === "guided" || design === "tabbed"
  const readOnly = mode === "view"
  const invoicesQuery = useInvoicesQuery()
  const [showDupWarning] = useState(true)
  const [ignoredDups, setIgnoredDups] = useState<Set<string>>(new Set())
  const { push: pushHistory } = useInvoiceUndoRedoStore()

  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(invoice ?? blankInvoice(), nextSrNo, defaultDept),
  })

  // Re-initialize only when a *different* invoice (or a fresh "add", signalled by nextSrNo
  // advancing after a save) is being opened — not on every open/close toggle. Otherwise an
  // accidental close (Escape, click outside) while filling the form silently wipes it, since
  // the dialog stays mounted and merely re-shows on the next open.
  const lastKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!open) return
    const key = invoice ? `edit:${invoice.id}` : `add:${nextSrNo ?? 0}`
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    setSection(0)
    setMaximized(false)
    form.reset(toValues(invoice ?? blankInvoice(), nextSrNo, defaultDept))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice, nextSrNo])

  // Narrow the Contract No. options to whichever vendor is selected, so picking a contract
  // can't accidentally attach an invoice to the wrong vendor's contract. Once a vendor is
  // picked, contracts with no known vendor are hidden too — but the currently-selected
  // contract (if any) is always kept in the list so it doesn't just vanish out from under it.
  const vendorValue = form.watch("vendor")
  const contractNoValue = form.watch("contractNo")
  const invoiceNoValue = form.watch("invoiceNo")
  const invoiceDateValue = form.watch("invoiceDate")
  const amountExclTax = form.watch("amountExclTax")
  const gstPst = form.watch("gstPst")
  const { tax, total } = useMemo(() => {
    const a = Number(amountExclTax) || 0
    const g = Number(gstPst) || 0
    const t = a * g
    return { tax: t, total: a + t }
  }, [amountExclTax, gstPst])
  const amountInclTaxValue = total

  const vendorContractNumbers = useMemo(() => {
    if (!vendorValue) return contractNumbers
    return contractNumbers.filter((c) => contractVendorMap[c] === vendorValue || c === contractNoValue)
  }, [contractNumbers, contractVendorMap, vendorValue, contractNoValue])

  // Detect potential duplicates based on current form values
  const duplicateMatches = useMemo(() => {
    if (!showDupWarning || mode === "view" || !invoicesQuery.data) return []
    const formValues: Partial<Invoice> = {
      invoiceNo: invoiceNoValue,
      vendor: vendorValue,
      invoiceDate: invoiceDateValue,
      amountInclTax: amountInclTaxValue,
    }
    const matches = detectDuplicates(formValues, invoicesQuery.data, invoice?.id)
    // Filter out ignored duplicates
    return matches.filter((m) => !ignoredDups.has(m.invoice.id))
  }, [invoiceNoValue, vendorValue, invoiceDateValue, amountInclTaxValue, invoice?.id, invoicesQuery.data, ignoredDups, showDupWarning, mode])


  function handleSubmit(values: Values) {
    const record: Invoice = {
      id: invoice?.id ?? crypto.randomUUID(),
      srNo: values.srNo,
      vendor: values.vendor,
      invoiceNo: values.invoiceNo,
      contractNo: values.contractNo || "",
      invoiceDate: values.invoiceDate || "",
      receivingDate: values.receivingDate || "",
      clearanceDate: values.clearanceDate || "",
      loginDate: values.loginDate || "",
      yr: invoice?.yr || "",
      receivingMonth: invoice?.receivingMonth || "",
      qtr: values.qtr || "",
      service: values.service || "",
      type: values.type || "",
      department: values.department || "",
      region: values.region || "",
      rig: values.rig || "",
      location: values.location || "",
      wellName: values.wellName || "",
      serviceMonth: values.serviceMonth || "",
      year: values.year !== undefined ? String(values.year) : "",
      description: values.description || "",
      amountExclTax: values.amountExclTax,
      gstPst: values.gstPst,
      tax,
      amountInclTax: total,
      amountPaid: values.amountPaid,
      status: values.status,
    }

    // Track change in history for undo/redo
    pushHistory({
      invoice: record,
      action: invoice ? "update" : "create",
      timestamp: Date.now(),
    })

    onSubmit(record)
  }

  function handleApplyTemplate(templateData: Partial<Invoice>) {
    form.reset({
      ...form.getValues(),
      vendor: templateData.vendor || form.getValues("vendor"),
      service: templateData.service || form.getValues("service"),
      department: templateData.department || form.getValues("department"),
      region: templateData.region || form.getValues("region"),
    })
  }

  const financialFields: (keyof FormInput)[] = ["amountExclTax", "gstPst", "amountPaid"]
  async function advance() {
    const fields: (keyof FormInput)[] = section === 0 ? ["srNo", "vendor", "invoiceNo", "status", "year"] : financialFields
    if (readOnly || await form.trigger(fields, { shouldFocus: true })) setSection((v) => Math.min(v + 1, 2))
  }
  const submit = form.handleSubmit(handleSubmit, (errors) => {
    const hasDetailsError = Object.keys(errors).some((key) => !financialFields.includes(key as keyof FormInput))
    if (paged) setSection(hasDetailsError ? 0 : 1)
  })
  const financialSummary = (
    <aside className="invoice-live-summary" aria-label="Invoice summary">
      <h3>Invoice summary</h3>
      <dl>
        <div><dt>Subtotal (USD)</dt><dd>{fmtMoney(Number(amountExclTax) || 0)}</dd></div>
        <div><dt>Tax (USD)</dt><dd>{fmtMoney(tax)}</dd></div>
        <div className="invoice-summary-total"><dt>Total (USD)</dt><dd>{fmtMoney(total)}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Calculated from the invoice amount and tax rate.</p>
    </aside>
  )

  const title = mode === "add" ? "New Invoice Entry" : mode === "edit" ? "Edit Invoice" : "Invoice Details"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="invoice-design-dialog max-h-[90dvh] w-full overflow-y-auto sm:max-w-4xl" data-design={design} maximizable={design === "tabbed"} maximized={maximized} onMaximizedChange={setMaximized}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="invoice-design-description">Invoice entry and financial details</DialogDescription>
              {invoice?.createdByName && (
                <p className="text-xs text-muted-foreground">
                  Entered by <b>{invoice.createdByName}</b>
                  {invoice.updatedByName && invoice.updatedByName !== invoice.createdByName && (
                    <>
                      {" "}
                      · last edited by <b>{invoice.updatedByName}</b>
                    </>
                  )}
                  {invoice.updatedAt && ` · ${invoice.updatedAt.slice(0, 10)}`}
                </p>
              )}
            </div>
            {mode === "add" && canEdit && (
              <InvoiceTemplateSelector
                currentVendor={vendorValue}
                onApplyTemplate={handleApplyTemplate}
                onSaveAsTemplate={() => {
                  // Templates are saved via the dialog's own state after user fills the form
                }}
              />
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => { if (design === "guided" && section < 2) { e.preventDefault(); void advance() } else { void submit(e) } }}
            onKeyDown={(e) => {
              // Enter inside any text/number/date field would otherwise silently submit
              // the whole 21-field form via the Save button — require an explicit click.
              if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault()
            }}
            className="invoice-design-form flex flex-col gap-4"
          >
            {paged && <nav className="invoice-section-nav" aria-label={design === "guided" ? "Invoice steps" : "Invoice sections"}>
              {["Invoice details", "Financials", "Review"].map((label, index) => (
                <button type="button" key={label} aria-pressed={section === index} disabled={design === "guided" && index > section}
                  onClick={() => setSection(index)}>
                  {design === "guided" && <span>{index + 1}</span>}{label}
                </button>
              ))}
            </nav>}
            {duplicateMatches.length > 0 && (
              <DuplicateDetectionWarning
                matches={duplicateMatches}
                onIgnore={() => {
                  const ids = new Set(duplicateMatches.map((m) => m.invoice.id))
                  setIgnoredDups(new Set([...ignoredDups, ...ids]))
                }}
              />
            )}

            <div className="invoice-design-body">
            <div className="invoice-edit-sections">
            <section className="invoice-form-section" hidden={paged && section !== 0}>
            <h3>Invoice details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="srNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sr. No.</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={readOnly} {...field} value={(field.value as number | undefined) ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SelectField name="vendor" label="Vendor" options={refLists.vendors} form={form} disabled={readOnly} />
              <SelectField name="department" label="Department" options={refLists.departments} form={form} disabled={readOnly} />
              <FormField
                control={form.control}
                name="invoiceNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice No.</FormLabel>
                    <FormControl>
                      <Input disabled={readOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SelectField
                name="contractNo"
                label="Contract No."
                options={vendorContractNumbers}
                optionLabels={contractLabels}
                form={form}
                disabled={readOnly}
                placeholder="— No Contract / Select… —"
              />
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receivingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receiving Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clearanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clearance Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loginDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Log-in Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <SelectField name="service" label="Service" options={refLists.services} form={form} disabled={readOnly} />
              <SelectField name="type" label="Type" options={refLists.types} form={form} disabled={readOnly} />
              <SelectField name="region" label="Region" options={refLists.regions} form={form} disabled={readOnly} />
              <FormField
                control={form.control}
                name="rig"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rig</FormLabel>
                    <FormControl>
                      <Input list="rigList" disabled={readOnly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <datalist id="rigList">
                {refLists.rigs.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input disabled={readOnly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wellName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Well Name</FormLabel>
                    <FormControl>
                      <Input list="wellList" disabled={readOnly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <datalist id="wellList">
                {refLists.wells.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
              <SelectField name="serviceMonth" label="Service Month" options={refLists.months} form={form} disabled={readOnly} />
              <SelectField name="qtr" label="Quarter" options={refLists.quarters} form={form} disabled={readOnly} />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={readOnly} {...field} value={(field.value as number | undefined) ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <SelectField name="status" label="Status" options={refLists.statuses} form={form} disabled={readOnly} />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} disabled={readOnly} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            </section>
            <section className="invoice-form-section" hidden={paged && section !== 1}>
            <h3>Amounts &amp; tax</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="amountExclTax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Excl. Tax (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={readOnly} {...field} value={(field.value as number | undefined) ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstPst"
                render={({ field }) => {
                  const stored = field.value as number | undefined
                  const pct = stored === undefined || stored === null || Number.isNaN(stored) ? "" : stored * 100
                  return (
                    <FormItem>
                      <FormLabel>GST / PST Rate (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            disabled={readOnly}
                            className="pr-7"
                            value={pct}
                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value) / 100)}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" disabled={readOnly} {...field} value={(field.value as number | undefined) ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {design !== "summary" && financialSummary}
            </section>
            {paged && section === 2 && <section className="invoice-form-section invoice-review">
              <h3>Review invoice</h3>
              <dl>{Object.entries(form.getValues()).filter(([key]) => !financialFields.includes(key as keyof FormInput)).map(([key, value]) => (
                <div key={key}><dt>{key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</dt><dd>{String(value ?? "") || "—"}</dd></div>
              ))}</dl>
              {financialSummary}
            </section>}
            </div>
            {design === "summary" && financialSummary}
            </div>
            <DialogFooter>
              {design === "guided" && section > 0 && <Button type="button" variant="outline" onClick={() => setSection((v) => v - 1)}>Back</Button>}
              {design === "guided" && section < 2 && <Button type="button" onClick={() => void advance()}>Continue</Button>}
              {!readOnly ? (
                <>
                  {/* type="button" + explicit handleSubmit, not type="submit" — the Edit and
                      Save buttons occupy the same slot across a mode switch, so React reuses
                      the same DOM node and just flips its `type` attribute. Some browsers treat
                      that flip, happening mid-click, as if the original click landed on a submit
                      button — silently submitting the form the instant you press Edit. Calling
                      handleSubmit directly sidesteps native submit semantics entirely. */}
                  {mode === "add" && (
                    <SaveAsTemplateButton
                      vendor={form.getValues("vendor")}
                      service={form.getValues("service")}
                      department={form.getValues("department")}
                      region={form.getValues("region")}
                    />
                  )}
                  <div className="flex-1" />
                  {(design !== "guided" || section === 2) && <Button type="button" onClick={() => void submit()}>Save Entry</Button>}
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                </>
              ) : (
                <>
                  {canEdit && (
                    <Button type="button" onClick={onSwitchToEdit}>
                      Edit
                    </Button>
                  )}
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Close
                    </Button>
                  </DialogClose>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
