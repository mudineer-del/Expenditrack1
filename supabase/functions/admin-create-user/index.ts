// Supabase Edge Function: lets an Admin create a new teammate's account
// directly from the Users page (email + name + an initial password), instead
// of the teammate having to self-sign-up.
//
// Deliberately does NOT set role/status/department/area grants here — the
// created account lands as a normal 'pending' profile (same as a self-signup,
// via the existing handle_new_user trigger reading raw_user_meta_data), and
// shows up in the Users page's existing "Pending Approval" list. The Admin
// finishes it with the same Review & Approve flow (AccessGrantPanel) already
// used for self-signups. This sidesteps profiles' protect_profile_role
// trigger entirely — that trigger runs on UPDATE and requires public.is_admin()
// (which reads auth.uid(), always null for a service_role-authenticated
// request) — rather than trying to make a service-role write satisfy it.
//
// This exists ONLY because account creation requires the service_role key
// (Supabase Auth Admin API), which must never be shipped to the browser. This
// function holds that key server-side (as a secret, injected via
// Deno.env.get — never committed to the repo) and is the single narrow place
// it's used. The caller's own session (anon-key-scoped) is what proves they're
// an Admin before this function ever touches the admin client.
//
// Deploy: see the "Deploying" section in README.md next to this file.

import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  // Scoped to the caller's own session (forwards their Authorization header) —
  // used only to find out who's calling and check their role, never to write.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return json({ error: "Not signed in." }, 401)
  }

  const { data: callerProfile, error: profileError } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single()
  if (profileError || callerProfile?.role !== "Admin") {
    return json({ error: "Only admins can create accounts." }, 403)
  }

  const body = await req.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const password = body?.password

  if (!email.includes("@")) return json({ error: "A valid email is required." }, 400)
  if (!name) return json({ error: "A name is required." }, 400)
  if (typeof password !== "string" || password.length < 8) {
    return json({ error: "A password of at least 8 characters is required." }, 400)
  }

  // The one place the service_role key is used — entirely server-side.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Admin-provisioned — no confirmation email, they can sign in with this password right away.
    user_metadata: { name },
  })
  if (createError || !created.user) {
    return json({ error: createError?.message || "Could not create the account." }, 400)
  }

  return json({ ok: true, userId: created.user.id }, 200)
})
