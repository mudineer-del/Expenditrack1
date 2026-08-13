import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
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

function toValues(inv: Invoice, nextSrNo?: number): FormInput {
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
  form,
  disabled,
  placeholder = "Select…",
}: {
  name: keyof FormInput
  label: string
  options: string[]
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
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
  canEdit: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Invoice) => void
  onSwitchToEdit: () => void
}) {
  const readOnly = mode === "view"
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(invoice ?? blankInvoice(), nextSrNo),
  })

  useEffect(() => {
    if (open) form.reset(toValues(invoice ?? blankInvoice(), nextSrNo))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice])

  const amountExclTax = form.watch("amountExclTax")
  const gstPst = form.watch("gstPst")
  const { tax, total } = useMemo(() => {
    const a = Number(amountExclTax) || 0
    const g = Number(gstPst) || 0
    const t = a * g
    return { tax: t, total: a + t }
  }, [amountExclTax, gstPst])

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
    onSubmit(record)
  }

  const title = mode === "add" ? "New Invoice Entry" : mode === "edit" ? "Edit Invoice" : "Invoice Details"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Invoice entry form</DialogDescription>
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
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
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
                options={contractNumbers}
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
            <div className="grid grid-cols-3 gap-3">
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
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div>
                Tax (USD): <b>{fmtMoney(tax)}</b>
              </div>
              <div>
                Amount Incl. Tax (USD): <b>{fmtMoney(total)}</b>
              </div>
            </div>
            <DialogFooter>
              {!readOnly ? (
                <>
                  <Button type="submit">Save Entry</Button>
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
