# send-email

Sends an email through Amazon SES, Admin-only. Two call sites use it:

- **Auto-dispatch on approval** — when an Admin approves a pending sign-up
  (Users page → Pending Approval → Review & Approve), an "Your account has
  been approved" email goes to that person automatically.
- **Send Email** — a compose dialog on the Users page for emailing one or
  more teammates directly, at any time.

Requires AWS credentials with SES permission, so it runs as a Supabase Edge
Function (server-side) instead of client code — those credentials must never
reach the browser.

## One-time setup — AWS side

This part happens in your AWS account, not in this repo, and isn't something
Claude can do or verify for you without AWS access:

1. **Verify a sender identity in SES** — either a single email address or a
   whole domain, in whichever AWS region you'll use. Amazon SES Console →
   Configuration → Verified identities → Create identity. Domain verification
   needs a DNS record added at your registrar; email verification just needs
   you to click a confirmation link SES sends that address.
2. **Check your account's SES sending status.** A brand-new AWS account's SES
   is in **sandbox mode**, which only allows sending to *other verified*
   addresses — not arbitrary user emails. To send to your real users, request
   production access: SES Console → Account dashboard → "Request production
   access" (a short form, usually approved within a day). Until that's
   approved, `send-email` will fail for any recipient that isn't also
   verified in SES.
3. **Create an IAM user/role with `ses:SendEmail` permission** (the AWS-managed
   `AmazonSESFullAccess` policy works, or scope it down to just `ses:SendEmail`
   + `ses:SendRawEmail` on your verified identity's ARN) and generate an
   access key for it.

## One-time setup — Supabase side

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed
and logged in (`supabase login`). If you already deployed `admin-set-password`
or the other `admin-*` functions, you're already linked — skip straight to
`deploy`.

```bash
# from the project root (e:\expenditrack Project)
supabase link --project-ref <your-project-ref>   # find this in your Supabase dashboard URL
supabase functions deploy send-email

supabase secrets set AWS_REGION=<e.g. us-east-1>
supabase secrets set AWS_ACCESS_KEY_ID=<paste-the-access-key-id>
supabase secrets set AWS_SECRET_ACCESS_KEY=<paste-the-secret-access-key>
supabase secrets set SES_FROM_EMAIL=<the-verified-sender-address>
```

**Never put these credentials in your app's code, .env files that get
committed, or paste them into a chat.**

## Verifying it worked

In the app, sign in as an Admin, go to **Users**, and use the **Email**
button on any teammate (or approve a pending sign-up). A success toast means
SES accepted it — check the recipient's inbox (and spam folder; a
freshly-verified sender has no reputation yet). A "500 ... secrets are
missing" error means one of the four secrets above wasn't set. A "502" error
passes through SES's own error message — the most common one on a fresh
account is a recipient not being verified because the account is still in
sandbox mode (see step 2 above).
