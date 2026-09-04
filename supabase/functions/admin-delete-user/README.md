# admin-delete-user

Lets an Admin permanently delete a teammate's account from the Users page.
Deletes the `auth.users` row via the Admin API; `public.profiles` (and
`profile_departments`/`profile_areas`) cascade away with it automatically.
Requires the service_role key, so it runs as a Supabase Edge Function
(server-side) instead of client code.

**This is irreversible** — there's no "restore" for a deleted account. The
Users page confirms with the admin before calling this.

## One-time setup

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed
and logged in (`supabase login`). If you already deployed
`admin-set-password` or `admin-create-user`, you're already linked — skip
straight to `deploy`.

```bash
# from the project root (e:\expenditrack Project)
supabase link --project-ref <your-project-ref>   # find this in your Supabase dashboard URL
supabase functions deploy admin-delete-user
```

It needs the same `SUPABASE_SERVICE_ROLE_KEY` secret as the other
`admin-*` functions — if you already set that secret, this function picks it
up automatically (secrets are shared across all functions in the project).
Otherwise:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-the-service-role-key>
```

**Never put this key in your app's code, .env files that get committed, or
paste it into a chat.**

## Verifying it worked

In the app, sign in as an Admin, go to **Users**, and use the delete action
on a teammate's row (not your own — the function refuses that). If you see
"Only admins can delete accounts." for an Admin account, the function
deployed but the caller's `profiles.role` isn't `Admin`. If the request fails
outright, double check the secret was set on the right linked project.
