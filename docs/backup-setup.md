# Automated Supabase backup — one-time setup

`.github/workflows/backup.yml` runs daily (03:00 UTC) and on-demand, exports
every table this app owns from Supabase, and pushes the result to a private
GitHub repo. It cannot run until you complete the three steps below — none
of them can be done by an agent, since they require your own GitHub and
Supabase account access.

**Why a separate private repo:** this repo (`mudineer-del/Expenditrack1`) is
public. Business data (invoices, vendor names, contract values) must never
be committed here, so the export always goes to a second, private repo.

## 1. Create the private backup repo

Create a new **private** GitHub repository. The workflow defaults to:

```
mudineer-del/expenditrack-backups
```

If you name it differently, update the `BACKUP_REPO` value at the top of
`.github/workflows/backup.yml` to match.

The repo can start empty — the workflow creates a `backups/` folder in it
on the first run.

## 2. Add `SUPABASE_SERVICE_ROLE_KEY`

This key bypasses Row Level Security so the export can read every row —
treat it as the most sensitive credential in the project.

1. Supabase dashboard → your project → **Project Settings → API**.
2. Copy the **service_role** key (not the `anon` key already used elsewhere
   in this app).
3. In this repo: **Settings → Secrets and variables → Actions → New
   repository secret**.
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: paste the key.
4. Never paste this key anywhere else — not into chat, not into a file in
   either repo, not into a commit. If it's ever exposed, rotate it from the
   same Supabase API settings page.

## 3. Add `BACKUP_REPO_TOKEN`

A GitHub token that only this workflow uses to push into the private backup
repo.

1. GitHub → your avatar → **Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → Generate new token**.
2. **Repository access**: "Only select repositories" → pick the private
   backup repo from step 1 (not this one).
3. **Permissions**: Repository permissions → **Contents: Read and write**.
   Nothing else is needed.
4. Generate, copy the token.
5. Back in **this** repo (`Expenditrack1`): **Settings → Secrets and
   variables → Actions → New repository secret**.
   - Name: `BACKUP_REPO_TOKEN`
   - Value: paste the token.

## Verify it

**Actions** tab in this repo → **Automated Supabase backup** → **Run
workflow** (the `workflow_dispatch` trigger lets you run it on demand
instead of waiting for 03:00 UTC). Check the private backup repo afterward
for a new file under `backups/`.

## Retention

The workflow keeps the most recent 60 daily backups in the private repo and
prunes older ones automatically, so that repo doesn't grow unbounded.
Change `RETENTION_COUNT` in the workflow file to adjust.

## Restoring from a backup

These files are raw table dumps (one JSON array per Supabase table:
`invoices`, `contracts`, `referenceLists`, `activityLog`, `wells`, and the
Well Cost tables) — a different, more literal shape than the app's own
Settings → Data & Backup → "Download backup" file, which is meant for a
human re-importing through that same screen. To restore from one of these
automated backups, re-insert each table's rows via the Supabase SQL editor
or `supabase-js`, matching each row to its table by the JSON key name.
