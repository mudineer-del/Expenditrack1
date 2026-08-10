import { create } from "zustand"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase"
import type { AppUser, Role } from "@/types/user"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface AuthState {
  status: AuthStatus
  session: Session | null
  user: AppUser | null
  error: string
  isRecovery: boolean
  clearRecovery: () => void
  initialize: () => () => void
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
  sendRecovery: (email: string) => Promise<{ ok: boolean; error?: string }>
  updatePassword: (password: string) => Promise<{ ok: boolean; error?: string }>
  updateProfile: (patch: Partial<Pick<AppUser, "name" | "phone" | "dept" | "designation">>) => Promise<{ ok: boolean; error?: string }>
}

/** Ported from currentUserFromSbUser (index.html:1177-1191): role/name/initials
 *  live in Supabase Auth's user_metadata, there is no separate users table. */
function userFromSbUser(u: User | null | undefined): AppUser | null {
  if (!u) return null
  const md = (u.user_metadata ?? {}) as Record<string, unknown>
  const name = (md.name as string) || u.email || ""
  const initials =
    (md.initials as string) ||
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  return {
    id: u.id,
    email: u.email || "",
    name,
    role: (md.role as Role) || "Viewer",
    initials,
    phone: md.phone as string | undefined,
    dept: (md.dept as string) || "Drilling Fluids",
    designation: md.designation as string | undefined,
    twofa: !!md.twofa,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  user: null,
  error: "",
  isRecovery: false,
  clearRecovery: () => set({ isRecovery: false }),

  initialize: () => {
    const supabase = getSupabaseClient()
    supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: userFromSbUser(data.session?.user),
        status: data.session ? "authenticated" : "unauthenticated",
      })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: userFromSbUser(session?.user),
        status: session ? "authenticated" : "unauthenticated",
        ...(event === "PASSWORD_RECOVERY" ? { isRecovery: true } : {}),
      })
    })
    return () => sub.subscription.unsubscribe()
  },

  signIn: async (email, password) => {
    const supabase = getSupabaseClient()
    set({ error: "" })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      return { ok: false, error: error.message }
    }
    set({
      session: data.session,
      user: userFromSbUser(data.user),
      status: "authenticated",
    })
    return { ok: true }
  },

  signUp: async (email, password, name) => {
    const supabase = getSupabaseClient()
    set({ error: "" })
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: "Viewer", initials } },
    })
    if (error) {
      set({ error: error.message })
      return { ok: false, error: error.message }
    }
    if (data.session) {
      set({ session: data.session, user: userFromSbUser(data.user), status: "authenticated" })
    }
    return { ok: true }
  },

  signOut: async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    set({ session: null, user: null, status: "unauthenticated" })
  },

  sendRecovery: async (email) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  },

  updatePassword: async (password) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  },

  updateProfile: async (patch) => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.updateUser({ data: patch })
    if (error) return { ok: false, error: error.message }
    set({ user: userFromSbUser(data.user) })
    return { ok: true }
  },
}))
