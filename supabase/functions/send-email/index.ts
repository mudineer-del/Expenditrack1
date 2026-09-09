// Supabase Edge Function: sends an email through Amazon SES (v2 API) on an
// Admin's behalf — the "approved" notification auto-dispatched from
// AccessGrantPanel when an Admin approves a pending sign-up, and the general
// "Send Email" compose dialog on the Users page for emailing one or more
// teammates directly.
//
// This exists ONLY because sending mail requires AWS credentials with SES
// permission, which must never be shipped to the browser. This function
// holds those credentials server-side (as secrets, injected via
// Deno.env.get — never committed to the repo) and is the single narrow
// place they're used. The caller's own session (anon-key-scoped) is what
// proves they're an Admin before this function ever touches SES.
//
// Signs the SES v2 REST API request by hand (AWS Signature Version 4) using
// only Deno's built-in Web Crypto API — deliberately NOT the `@aws-sdk/*`
// npm packages, whose dependency trees are heavy enough that they were
// failing to boot on this edge runtime (every invocation came back as
// "Failed to send a request to the Edge Function", i.e. the function never
// even started, not a normal error response). Zero external dependencies
// here removes that whole failure class.
//
// Deploy: see the "Deploying" section in README.md next to this file.
// Requires AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION /
// SES_FROM_EMAIL secrets — see README.md for the AWS-side setup (verified
// sender identity, sandbox mode) that has to be done in your AWS account
// before this can actually deliver mail, which is outside what this
// function or Claude can verify or configure for you.

import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

const encoder = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(data)))
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
}

/** AWS Signature Version 4 for a single POST request with a JSON body — the
 *  minimal subset SES v2's SendEmail needs (no query string, one signed
 *  service). See docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html. */
async function signSesRequest(opts: {
  region: string
  accessKeyId: string
  secretAccessKey: string
  host: string
  path: string
  body: string
}): Promise<{ headers: Record<string, string> }> {
  const { region, accessKeyId, secretAccessKey, host, path, body } = opts
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "") // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8) // YYYYMMDD

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`
  const signedHeaders = "content-type;host;x-amz-date"
  const payloadHash = await sha256Hex(body)
  const canonicalRequest = ["POST", path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n")

  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n")

  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, "ses")
  const kSigning = await hmac(kService, "aws4_request")
  const signature = toHex(await hmac(kSigning, stringToSign))

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    headers: {
      "Content-Type": "application/json",
      Host: host,
      "X-Amz-Date": amzDate,
      Authorization: authorization,
    },
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

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
    return json({ error: "Only admins can send email." }, 403)
  }

  const body = await req.json().catch(() => null)
  const toRaw = body?.to
  const to: string[] = Array.isArray(toRaw) ? toRaw : typeof toRaw === "string" ? [toRaw] : []
  const subject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const html = typeof body?.html === "string" ? body.html : ""
  const text = typeof body?.text === "string" ? body.text : html ? stripHtml(html) : ""

  if (!to.length || to.some((addr) => typeof addr !== "string" || !addr.includes("@"))) {
    return json({ error: "At least one valid recipient email is required." }, 400)
  }
  if (!subject) return json({ error: "A subject is required." }, 400)
  if (!html && !text) return json({ error: "An email body is required." }, 400)

  const region = Deno.env.get("AWS_REGION")
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID")
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")
  const fromEmail = Deno.env.get("SES_FROM_EMAIL")
  if (!region || !accessKeyId || !secretAccessKey || !fromEmail) {
    return json(
      { error: "Email sending isn't configured yet — AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/SES_FROM_EMAIL secrets are missing. See README.md." },
      500
    )
  }

  const host = `email.${region}.amazonaws.com`
  const path = "/v2/email/outbound-emails"
  const requestBody = JSON.stringify({
    FromEmailAddress: fromEmail,
    Destination: { ToAddresses: to },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    },
  })

  try {
    const { headers } = await signSesRequest({ region, accessKeyId, secretAccessKey, host, path, body: requestBody })
    const res = await fetch(`https://${host}${path}`, { method: "POST", headers, body: requestBody })
    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      // SES's own error text already distinguishes the common causes (unverified
      // sender/recipient in sandbox mode, throttling, bad region/credentials) —
      // passed through as-is rather than re-interpreted, since guessing which one
      // applies without seeing the AWS account's actual state would just be a guess.
      return json({ error: `SES rejected the request (${res.status}): ${errBody || res.statusText}` }, 502)
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not reach AWS SES." }, 502)
  }

  return json({ ok: true, sent: to.length }, 200)
})
