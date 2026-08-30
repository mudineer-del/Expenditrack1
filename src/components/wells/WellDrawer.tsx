import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { WELL_STATUS_OPTIONS } from "@/lib/wellCost"
import { blankWell, type Well } from "@/types/well"

const schema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().optional(),
  field: z.string().optional(),
  operator: z.string().optional(),
  status: z.string().min(1, "Required"),
  startDate: z.string().optional(),
  description: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type Values = z.output<typeof schema>

function toValues(w: Well): FormInput {
  return {
    name: w.name,
    code: w.code,
    field: w.field,
    operator: w.operator,
    status: w.status || "Planned",
    startDate: w.startDate,
    description: w.description,
  }
}

export function WellDrawer({
  open,
  well,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  well: Well | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Well) => void
}) {
  const isEdit = !!well
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(well ?? blankWell()),
  })

  useEffect(() => {
    if (open) form.reset(toValues(well ?? blankWell()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, well])

  function handleSubmit(values: Values) {
    const record: Well = {
      id: well?.id ?? crypto.randomUUID(),
      name: values.name,
      code: values.code || "",
      field: values.field || "",
      operator: values.operator || "",
      status: values.status,
      archived: well?.archived ?? false,
      startDate: values.startDate || "",
      description: values.description || "",
    }
    onSubmit(record)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Well" : "New Well"}</DialogTitle>
          <DialogDescription className="sr-only">Well entry form</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault()
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Well Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Well-01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Well Code / ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. W-001" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field / Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operator / Asset</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                        {WELL_STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Well</Button>
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
