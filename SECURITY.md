# Security

## What's already committed (and shouldn't be)

The project's original `.env` was committed to git and contains the live
Supabase **anon public key** for project `bednhbsaxzwdwjqxewpz`. Anyone
with that key can hit the project's PostgREST endpoint. RLS limits what
they can read/write, but the project ID + URL are now public and any
abuse will hit your quota.

## Rotate the leaked key (do this first)

1. Open the Supabase dashboard:
   https://supabase.com/dashboard/project/bednhbsaxzwdwjqxewpz/settings/api
2. Under **Project API keys**, click **Roll anon key**.
3. Copy the new value into your local `.env`.
4. Restart `npm run dev`.
5. Deploy the updated secret to any hosting provider you use.

## Scrub `.env` from git history

After rotating the key, remove the old file from history so future clones
don't re-leak it. Use `git-filter-repo` (preferred) or BFG:

```bash
# git-filter-repo (recommended)
pip install git-filter-repo
git filter-repo --path .env --invert-paths

# BFG Repo-Cleaner (alternative)
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force-push to overwrite history everywhere
git push origin --force --all
git push origin --force --tags
```

**Coordinate this with any collaborators first** — they will need to
re-clone or follow `git pull --rebase` after the force-push.

## Phase 1 hardening already applied

See `supabase_migration_phase1_security.sql`. It:

- Adds `employees.auth_user_id` and backfills it from `auth.users`
- Creates the missing `salaries` table
- Replaces permissive RLS policies on `employees` with role-based ones
- Adds role-based RLS on `salaries`
- All policies use `auth_user_id = auth.uid()` (the previous `id = auth.uid()`
  never matched because `employees.id` is TEXT like `EMP01`)

The app was also updated:
- `src/data/auth.js` now looks up the employee by `auth_user_id` and
  self-heals any rows that pre-date the migration
- `src/components/SetupWizard.jsx` writes `authUserId` on first-run bootstrap
- `supabase/functions/validate-invite/index.ts` writes `auth_user_id` when
  activating an invited employee

## What still needs work (Phase 2+)

- The 22 other tables still use permissive `USING (true)` RLS.
- Session is stored in `sessionStorage` (XSS-readable) instead of httpOnly cookies.
- See the project analysis for the full backlog.