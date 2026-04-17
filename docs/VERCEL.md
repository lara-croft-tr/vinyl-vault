# Vercel Deployment & Dev Loop

How this repo ships to production and how to work on it locally.

## TL;DR

- **Production:** https://vinyl-vault-iota.vercel.app/
- **Host:** Vercel (auto-deploys from GitHub)
- **Main branch:** `main` deploys to production
- **Branches / PRs:** get unique preview URLs automatically

## One-time local setup

```bash
# 1. Vercel CLI (globally installed)
npm install -g vercel

# 2. Log in (opens browser, one-time)
vercel login

# 3. Link this folder to the Vercel project
cd ~/vinyl-vault
vercel link                   # pick "existing project" -> vinyl-vault

# 4. Pull production env vars locally
vercel env pull .env.local    # creates .env.local with DISCOGS_TOKEN etc.

# 5. Install deps and verify it builds
npm install
npm run build
```

After step 3 the repo has `.vercel/` (already gitignored).
After step 4 the repo has `.env.local` (also gitignored).

## Daily development loop

### Small / safe changes

```bash
npm run dev                   # localhost:3000
# edit files, refresh browser
git add -A && git commit -m "describe change"
git push                      # main auto-deploys in ~60-90s
```

### Bigger / risky changes (recommended path)

```bash
git checkout -b feature/<name>
npm run dev
# edit, test locally
git push -u origin feature/<name>
gh pr create --fill
# Vercel posts a preview URL on the PR within ~60s
# Review the preview URL, then:
gh pr merge --squash          # deploys to prod after merge
```

## Operating in production

```bash
# Tail runtime logs
vercel logs https://vinyl-vault-iota.vercel.app --follow

# List recent deployments
vercel ls

# Inspect a specific deployment (build logs, status)
vercel inspect <deployment-url>

# Instant rollback to the previous deployment
vercel rollback
```

## Environment variables

| Variable | Purpose | Where set |
|---|---|---|
| `DISCOGS_TOKEN` | Discogs personal access token (API auth) | Vercel dashboard -> Settings -> Environment Variables |
| `DISCOGS_USERNAME` | Your Discogs username (for collection/wishlist scoping) | Vercel dashboard |

To add or update:
1. Set in the Vercel dashboard (Development / Preview / Production scopes).
2. Re-run `vercel env pull .env.local` locally.
3. Trigger a redeploy (`vercel --prod` or push a commit) so the new value ships.

Never commit `.env.local` or any file with these values.

## Push policy (current default)

Default is **PR-first** for changes touching:
- Discogs API calls (`src/lib/discogs.ts`)
- Auth / env var usage
- Any user-facing UI that Matt hasn't seen

Direct-to-`main` is fine for:
- Pure refactors / renames
- Dependency bumps that pass `npm run build`
- Doc-only changes

Claude (when working in this repo) should default to branch + PR unless explicitly told "push straight to main."

## Before pushing (always)

```bash
npm run build        # catch type errors and build failures locally
npm run lint         # eslint
```

If either fails, don't push. Vercel will surface the same errors and the deployment will fail.

## Known gotchas

- Discogs API rate-limits to 60 req/min authenticated. The main collection page
  pulls up to 1000 items (10 pages of 100) per render; stats page pulls up to 500.
  A burst of reloads can trip the limit. Consider adding a cache layer if this bites.
- `force-dynamic` is set on the main pages (`src/app/page.tsx`, `/stats`, `/wishlist`)
  so every request re-fetches from Discogs. No ISR caching today.
- The Ultimate Guitar tab lookup is a client-side deep-link; it doesn't call an API,
  it just opens UG search with a query string.

## Quick reference

| Task | Command |
|---|---|
| Local dev | `npm run dev` |
| Prod-mode local | `npm run build && npm run start` |
| Deploy to preview | `vercel` |
| Deploy to production | `vercel --prod` (or merge to `main`) |
| Tail logs | `vercel logs <url> --follow` |
| Rollback | `vercel rollback` |
| Pull env vars | `vercel env pull .env.local` |
