import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"

const schema = z.object({
  name: z.string().min(1, "Required"),
  phone: z.string().optional(),
  dept: z.string().optional(),
  designation: z.string().optional(),
})
type Values = z.infer<typeof schema>

/** Ported from the Profile settings tab (index.html:5248-5270). */
export function ProfileTab() {
  const { user, updateProfile } = useAuth()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      dept: user?.dept || "Drilling Fluids",
      designation: user?.designation || "",
    },
  })

  async function onSubmit(values: Values) {
    const r = await updateProfile(values)
    if (r.ok) toast.success("Profile updated.")
    else toast.error(r.error || "Could not update profile.")
  }

  if (!user) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Profile Information</h3>
      <div className="mb-5 flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{user.name}</div>
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{user.role}</span>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Sign-in Email</FormLabel>
            <FormControl>
              <Input value={user.email} disabled />
            </FormControl>
          </FormItem>
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+92 ..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dept"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Chief Engineer" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Save Profile
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
