import { create } from "zustand"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase"
import { uploadAvatarFile } from "@/lib/avatars"
import { fromProfileRow, type ProfileRow } from "@/lib/profiles"
import type { AppUser, Role } from "@/types/user"

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "pending" | "disabled"

/** Maps an AppUser's profile status to the store's auth status — "active"
 *  (or the pre-migration fallback path, which has no status column to read)
 *  is the only one that gets into the app; "pending"/"disabled" instead show
 *  AccountPendingPage via RequireAuth. */
function statusFor(user: AppUser): AuthStatus {
  if (user.status === "pending") return "pending"
  if (user.status === "disabled") return "disabled"
  return "authenticated"
}

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
  updateProfile: (patch: Partial<Pick<AppUser, "name" | "phone" | "dept" | "designation" | "avatarUrl">>) => Promise<{ ok: boolean; error?: string }>
  uploadAvatar: (file: File) => Promise<{ ok: boolean; error?: string }>
  removeAvatar: () => Promise<{ ok: boolean; error?: string }>
}

/** Fallback only: used if the profiles row can't be read (e.g. supabase/profiles_setup.sql
 *  hasn't been run yet). Ported from the original currentUserFromSbUser. */
function fallbackUserFromSbUser(u: User): AppUser {
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
    avatarUrl: md.avatarUrl as string | undefined,
    // No profiles row to read a real status/grants from (this only runs if
    // access_control_setup.sql — or profiles_setup.sql itself — hasn't been
    // applied yet) — "active" + unscoped keeps existing behavior rather than
    // locking everyone out because of a migration gap.
    status: "active",
    departments: [],
    areas: [],
    accessControlInstalled: false,
  }
}

/** Source of truth is public.profiles (see supabase/profiles_setup.sql), which — unlike
 *  auth.users.raw_user_meta_data — an Admin's session can read/edit for every account,
 *  not just their own. Falls back to auth metadata if the migration hasn't run yet.
 *  Also pulls this user's own department/area grants (supabase/access_control_setup.sql)
 *  — RLS on those two tables already limits a non-admin to just their own rows, so no
 *  extra filtering is needed here beyond the .eq("profile_id", ...) itself. */
async function resolveUser(supabase: SupabaseClient, sbUser: User | null | undefined): Promise<AppUser | null> {
  if (!sbUser) return null
  const { data, error } = await supabase.from("profiles").select("*").eq("id", sbUser.id).single()
  if (error || !data) return fallbackUserFromSbUser(sbUser)

  const [deptRes, areaRes] = await Promise.all([
    supabase.from("profile_departments").select("department").eq("profile_id", sbUser.id),
    supabase.from("profile_areas").select("area").eq("profile_id", sbUser.id),
  ])
  // A query error here (as opposed to succeeding with zero rows) means those
  // tables don't exist yet — access_control_setup.sql hasn't been run — not
  // that this user genuinely has no grants. Fail OPEN in that case: full access,
  // matching pre-migration behavior, instead of locking out every non-admin the
  // moment this frontend code ships ahead of the SQL that's supposed to back it.
  const accessControlInstalled = !deptRes.error && !areaRes.error
  const departments = (deptRes.data ?? []).map((r) => r.department as string)
  const areas = (areaRes.data ?? []).map((r) => r.area as string)
  return fromProfileRow(data as ProfileRow, departments, areas, accessControlInstalled)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  user: null,
  error: "",
  isRecovery: false,
  clearRecovery: () => set({ isRecovery: false }),

  initialize: () => {
    const supabase = getSupabaseClient()
    // A single source of truth: onAuthStateChange fires once immediately with
    // whatever session already exists (event "INITIAL_SESSION") and then again
    // for every subsequent change, so a separate getSession() call is both
    // redundant and dangerous here — as two independent async chains, it could
    // resolve *after* a PASSWORD_RECOVERY event and stomp status back to
    // "unauthenticated", bouncing the user to /login before isRecovery ever
    // takes effect.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Set isRecovery synchronously, before the profiles round-trip below —
      // App.tsx's redirect to /reset-password depends on it, and shouldn't
      // wait on a network fetch the reset-password form doesn't even need.
      if (event === "PASSWORD_RECOVERY") {
        set({ isRecovery: true, session, status: session ? "authenticated" : "unauthenticated" })
      }
      void (async () => {
        const user = await resolveUser(supabase, session?.user)
        set({
          session,
          user,
          status: user ? statusFor(user) : "unauthenticated",
          ...(event === "PASSWORD_RECOVERY" ? { isRecovery: true } : {}),
        })
      })()
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
    const user = await resolveUser(supabase, data.user)
    set({ session: data.session, user, status: user ? statusFor(user) : "unauthenticated" })
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
      const user = await resolveUser(supabase, data.user)
      // Freshly signed-up profiles default to 'pending' (see access_control_setup.sql),
      // so this almost always resolves to "pending" here, not "authenticated" — RequireAuth
      // shows AccountPendingPage instead of the app shell as soon as this status lands.
      set({ session: data.session, user, status: user ? statusFor(user) : "unauthenticated" })
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
    const current = get().user
    if (!current) return { ok: false, error: "Not signed in." }
    const { avatarUrl, ...rest } = patch
    const dbPatch: Record<string, unknown> = { ...rest }
    if ("avatarUrl" in patch) dbPatch.avatar_url = avatarUrl ?? null
    const { data, error } = await supabase.from("profiles").update(dbPatch).eq("id", current.id).select().single()
    if (error) return { ok: false, error: error.message }
    set({ user: fromProfileRow(data as ProfileRow) })
    return { ok: true }
  },

  uploadAvatar: async (file) => {
    const current = get().user
    if (!current) return { ok: false, error: "Not signed in." }
    const r = await uploadAvatarFile(current.id, file)
    if (!r.ok) return r
    return get().updateProfile({ avatarUrl: r.url })
  },

  removeAvatar: async () => {
    return get().updateProfile({ avatarUrl: undefined })
  },
}))
