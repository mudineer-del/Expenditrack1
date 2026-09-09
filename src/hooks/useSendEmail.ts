import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

/** Admin-only (enforced by the send-email Edge Function, which requires AWS SES
 *  credentials it never ships to the browser — see its README.md). Logs a
 *  "Send" activity entry on success so outbound mail shows up in the Audit Trail
 *  same as any other change. */
export function useSendEmail() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: SendEmailInput) => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.functions.invoke("send-email", { body: input })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const toList = Array.isArray(input.to) ? input.to : [input.to]
      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Add",
        `Emailed ${toList.length > 1 ? `${toList.length} recipients` : toList[0]}: "${input.subject}"`,
        { emailTo: toList.join(", "), subject: input.subject }
      )
      return data as { ok: true; sent: number }
    },
  })
}
