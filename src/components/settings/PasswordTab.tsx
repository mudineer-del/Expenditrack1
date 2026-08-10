import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { getSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"

const schema = z
  .object({
    current: z.string().min(1, "Required"),
    next: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(1, "Required"),
  })
  .refine((v) => v.next === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
type Values = z.infer<typeof schema>

/** Ported from the Password settings tab (index.html:5298-5314). Supabase's
 *  updateUser doesn't require the current password once a session is valid,
 *  so this re-authenticates via signInWithPassword first to preserve the
 *  same "prove you know the current password" behavior the legacy form had. */
export function PasswordTab() {
  const { user, updatePassword } = useAuth()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current: "", next: "", confirm: "" },
  })

  async function onSubmit(values: Values) {
    if (!user?.email) return
    const supabase = getSupabaseClient()
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: values.current })
    if (reauthError) {
      form.setError("current", { message: "Current password is incorrect." })
      return
    }
    const r = await updatePassword(values.next)
    if (r.ok) {
      toast.success("Password updated.")
      form.reset()
    } else {
      toast.error(r.error || "Could not update password.")
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Change Password</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-sm gap-4">
          <FormField
            control={form.control}
            name="current"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="next"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Use at least 8 characters with a mix of letters and numbers.</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-fit" disabled={form.formState.isSubmitting}>
            Update Password
          </Button>
        </form>
      </Form>
    </div>
  )
}
