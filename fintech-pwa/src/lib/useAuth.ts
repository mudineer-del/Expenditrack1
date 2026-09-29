import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    if (!supabase) {
      setStatus("unauthenticated")
      return
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setStatus(s ? "authenticated" : "unauthenticated")
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    if (!supabase) return { ok: false, error: "Supabase is not configured." }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return { session, status, signIn, signOut }
}
