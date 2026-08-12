# admin-set-password

Lets an Admin set another user's password directly from the Users page,
without emailing them a reset link. Requires the service_role key, so it
runs as a Supabase Edge Function (server-side) instead of client code.

## One-time setup

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed
and logged in (`supabase login`).

```bash
# from the project root (e:\expenditrack Project)
supabase link --project-ref <your-project-ref>   # find this in your Supabase dashboard URL
supabase functions deploy admin-set-password
```

The function needs your project's **service_role key** as a secret — get it
from Supabase Dashboard → Project Settings → API → `service_role` (the
*secret* one, not `anon`). **Never put this key in your app's code, .env
files that get committed, or paste it into a chat.**

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-the-service-role-key>
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided automatically to every
Edge Function by Supabase — no need to set those yourself.

## Verifying it worked

In the app, sign in as an Admin, go to **Users**, and use the "Set password"
action on a teammate's row. If you see "Only admins can set another user's
password." for an Admin account, the function deployed but the caller's
`profiles.role` isn't `Admin` (or `supabase/profiles_setup.sql` hasn't been
run yet). If the request fails outright, double check the secret was set on
the right linked project.
