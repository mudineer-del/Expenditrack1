# admin-create-user

Lets an Admin create a new teammate's account directly from the Users page
(email, name, an initial password) instead of the teammate self-signing-up.
The new account lands as a normal **pending** profile — same as a self-signup
— and shows up in the Users page's "Pending Approval" list, where the Admin
finishes it off with the existing Review & Approve flow (role, departments,
areas). Requires the service_role key, so it runs as a Supabase Edge Function
(server-side) instead of client code.

## One-time setup

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed
and logged in (`supabase login`). If you already deployed
`admin-set-password`, you're already linked — skip straight to `deploy`.

```bash
# from the project root (e:\expenditrack Project)
supabase link --project-ref <your-project-ref>   # find this in your Supabase dashboard URL
supabase functions deploy admin-create-user
```

It needs the same `SUPABASE_SERVICE_ROLE_KEY` secret as `admin-set-password`
— if you already set that secret, this function picks it up automatically
(secrets are shared across all functions in the project). Otherwise:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-the-service-role-key>
```

**Never put this key in your app's code, .env files that get committed, or
paste it into a chat.**

## Verifying it worked

In the app, sign in as an Admin, go to **Users**, and use **Add Account**. The
new account should appear under **Pending Approval** immediately. If you see
"Only admins can create accounts." for an Admin account, the function
deployed but the caller's `profiles.role` isn't `Admin`. If the request fails
outright, double check the secret was set on the right linked project.
