# Instant calendar sync webhook (one-time setup)

This Apps Script web app lets the Togetherment app trigger the calendar sync
workflow immediately after a change, with **zero setup for housemates**. The
GitHub token lives in the script's server-side properties — never in the repo
or the app bundle.

## 1. Create a fine-grained GitHub PAT

GitHub → your avatar → **Settings → Developer settings → Personal access
tokens → Fine-grained tokens → Generate new token**:

- Name: `togetherment-sync-webhook`
- Expiration: 1 year (put a reminder in the house calendar to rotate it 🙂)
- Repository access: **Only select repositories** → `lox352/togetherment`
- Permissions → Repository permissions → **Actions: Read and write**
  (leave everything else "No access")

Copy the token (`github_pat_…`).

## 2. Create the Apps Script

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Replace the default code with the contents of `Code.gs` from this folder.
3. Rename the project to "Togetherment sync webhook".
4. Gear icon (Project Settings) → **Script Properties** → Add property:
   - Property: `GITHUB_PAT`
   - Value: the token from step 1.

## 3. Deploy as a web app

1. **Deploy → New deployment** → type: **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. Deploy, authorise when prompted, and copy the web app URL
   (`https://script.google.com/macros/s/…/exec`).

Test it by opening the URL in a browser — you should see
"Togetherment sync webhook is running."

## 4. Wire it into the app

Paste the URL into `SYNC_WEBHOOK_URL` in `app/src/config.ts` and deploy.

## Notes

- The URL ships in the public app bundle. That's an accepted trade-off: the
  endpoint can only trigger a calendar sync (idempotent, no data access), and
  the workflow's concurrency group collapses request floods to at most one
  running + one queued run. If it ever gets abused, create a new deployment
  (new URL) and update the config.
- If you edit `Code.gs` later, use **Deploy → Manage deployments → edit →
  New version** — creating a brand-new deployment changes the URL.
- Token expired? Sync silently falls back to the nightly schedule; generate a
  new PAT and update the `GITHUB_PAT` script property.
