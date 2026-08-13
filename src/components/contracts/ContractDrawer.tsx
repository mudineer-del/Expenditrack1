import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
import { CONTRACT_STATUS_OPTIONS } from "@/lib/contracts"
import { blankContract, type Contract } from "@/types/contract"
import type { ReferenceLists } from "@/lib/referenceLists"

const OTHER_VENDOR = "__other__"

const schema = z.object({
  contractNo: z.string().min(1, "Required"),
  vendor: z.string().min(1, "Required"),
  vendorOther: z.string().optional(),
  title: z.string().optional(),
  status: z.string().min(1, "Required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
})

type FormInput = z.input<typeof schema>
type Values = z.output<typeof schema>

function toDateInput(d: string | null | undefined): string {
  if (!d) return ""
  return String(d).slice(0, 10)
}

function toValues(c: Contract, vendors: string[]): FormInput {
  const knownVendor = vendors.includes(c.vendor)
  return {
    contractNo: c.contractNo,
    vendor: c.vendor && !knownVendor ? OTHER_VENDOR : c.vendor,
    vendorOther: c.vendor && !knownVendor ? c.vendor : "",
    title: c.title,
    status: c.status || "Active",
    startDate: toDateInput(c.startDate),
    endDate: toDateInput(c.endDate),
    value: c.value === "" ? undefined : Number(c.value),
  }
}

export function ContractDrawer({
  open,
  contract,
  refLists,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  contract: Contract | null
  refLists: ReferenceLists
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Contract) => void
}) {
  const isEdit = !!contract
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(contract ?? blankContract(), refLists.vendors),
  })

  useEffect(() => {
    if (open) form.reset(toValues(contract ?? blankContract(), refLists.vendors))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract])

  const vendorValue = form.watch("vendor")

  function handleSubmit(values: Values) {
    const record: Contract = {
      id: contract?.id ?? crypto.randomUUID(),
      contractNo: values.contractNo,
      vendor: values.vendor === OTHER_VENDOR ? (values.vendorOther || "").trim() : values.vendor,
      title: values.title || "",
      value: values.value ?? "",
      startDate: values.startDate || "",
      endDate: values.endDate || "",
      status: values.status,
    }
    onSubmit(record)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contract" : "New Contract Provision"}</DialogTitle>
          <DialogDescription className="sr-only">Contract entry form</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            onKeyDown={(e) => {
              // Enter inside a text field would otherwise silently submit the form via
              // the Save button — require an explicit click.
              if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault()
            }}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="contractNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract No.</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {refLists.vendors.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                        <SelectItem value={OTHER_VENDOR}>Other / Type below</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendorOther"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (if Other)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={vendorValue !== OTHER_VENDOR} placeholder="Enter vendor name" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTRACT_STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Value (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Contract</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
