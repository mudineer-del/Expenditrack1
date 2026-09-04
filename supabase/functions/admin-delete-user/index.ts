// Supabase Edge Function: lets an Admin permanently delete a teammate's
// account from the Users page. Deletes the auth.users row via the Admin API;
// public.profiles (and profile_departments/profile_areas, and anything else
// with id/profile_id -> profiles(id) on delete cascade) cascades away with it
// — see supabase/profiles_setup.sql / access_control_setup.sql.
//
// This exists ONLY because account deletion requires the service_role key
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
    return json({ error: "Only admins can delete accounts." }, 403)
  }

  const body = await req.json().catch(() => null)
  const userId = body?.userId
  if (typeof userId !== "string" || !userId) return json({ error: "A user id is required." }, 400)
  if (userId === callerData.user.id) return json({ error: "You can't delete your own account." }, 400)

  // The one place the service_role key is used — entirely server-side.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) return json({ error: deleteError.message }, 400)

  return json({ ok: true }, 200)
})
