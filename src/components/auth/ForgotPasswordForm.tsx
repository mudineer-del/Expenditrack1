import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
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
import { useAuth } from "@/hooks/useAuth"

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
})

type Values = z.infer<typeof schema>

export function ForgotPasswordForm({ onBackToLogin }: { onBackToLogin: () => void }) {
  const { sendRecovery } = useAuth()
  const [sent, setSent] = useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: Values) {
    const r = await sendRecovery(values.email)
    if (!r.ok) {
      form.setError("email", { message: r.error || "Could not send reset email." })
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a password reset link has been sent.
        </p>
        <Button variant="outline" onClick={onBackToLogin}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="name@ogdcl.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <button type="button" onClick={onBackToLogin} className="text-primary hover:underline">
            Back to sign in
          </button>
        </p>
      </form>
    </Form>
  )
}
