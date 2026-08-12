// Supabase Edge Function: lets an Admin set another user's password directly.
//
// This exists ONLY because that operation requires the service_role key
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
    return json({ error: "Only admins can set another user's password." }, 403)
  }

  const body = await req.json().catch(() => null)
  const userId = body?.userId
  const newPassword = body?.newPassword
  if (typeof userId !== "string" || typeof newPassword !== "string" || newPassword.length < 8) {
    return json({ error: "A user id and a password of at least 8 characters are required." }, 400)
  }

  // The one place the service_role key is used — entirely server-side.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
  if (updateError) return json({ error: updateError.message }, 400)

  return json({ ok: true }, 200)
})
