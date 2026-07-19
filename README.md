# Togetherment

A household app for a shared apartment: fair weekly chore rota with swaps and
completion tracking, a shopping/"running low" list, who's-away-when and guest
stays, monthly-ish gatherings, and assignable action items — all mirrored to a
shared Google Calendar everyone can follow on their phone.

**Zero hosting cost:** React SPA on GitHub Pages · Firebase free tier (Auth +
Firestore, no Cloud Functions) · GitHub Actions for deploys and calendar sync.

## How the rota works

- Assignments are **computed, never stored**: a deterministic round-robin maps
  each ISO week to assignments, so the app and the calendar sync always agree.
- Config lives in append-only **epochs** (`rotaEpochs`): editing chores or the
  rotation order in Settings creates a snapshot effective next Monday. Past
  weeks always resolve against the config active at the time.
- **Swaps** trade whole chore-weeks between two people (same-week trades work
  too) and can be undone by either party. Completions are ticked per chore.

The engine is `packages/shared` — pure TypeScript, no Firebase, heavily
unit-tested. Both the app and the sync script import it.

## Repo layout

```
packages/shared/   rota engine, ISO week math, shared types (vitest)
app/               Vite + React SPA (GitHub Pages, HashRouter)
sync/              Google Calendar sync + one-time calendar setup script
firebase/          Firestore security rules
.github/workflows/ Pages deploy + daily calendar sync
```

## Setup (one-time)

### 1. Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → Add
   project (e.g. `togetherment`). Analytics not needed.
2. Project settings → Your apps → Add **Web app** → copy the config object
   into `app/src/firebaseConfig.ts`.
3. Build → **Authentication** → Get started → enable the **Google** provider.
4. Authentication → Settings → **Authorized domains** → add
   `<your-username>.github.io`.
5. Build → **Firestore Database** → Create database → production mode →
   pick a region near you.

### 2. Allowlist & rules

1. Edit `firebase/firestore.rules`: put every housemate's Google email in the
   `isMember()` list.
2. ```sh
   npm i -g firebase-tools
   firebase login
   cd firebase && firebase deploy --only firestore:rules --project <project-id>
   ```
   Re-run these two steps whenever a housemate joins or leaves.

### 3. Timezone

Set `HOUSEHOLD_TZ` in `packages/shared/src/config.ts` to the apartment's IANA
timezone (this pins week boundaries for travellers).

### 4. GitHub Pages

Repo → Settings → Pages → Source: **GitHub Actions**. Pushing to `main` then
deploys automatically (tests must pass). If your repo isn't at
`/togetherment/`, update `base` in `app/vite.config.ts`.

### 5. Calendar sync (optional but nice)

1. [console.cloud.google.com](https://console.cloud.google.com) (same project)
   → IAM & Admin → Service Accounts → create `togetherment-sync` with role
   **Cloud Datastore Viewer**. Create a JSON key and download it.
2. APIs & Services → Library → enable **Google Calendar API**.
3. Create the shared calendar (owned by the service account):
   ```sh
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
     npm run setup-calendar --workspace=sync -- alice@gmail.com bob@gmail.com
   ```
4. GitHub repo → Settings →
   - Secrets → **GCP_SA_KEY**: paste the JSON key contents (then delete the
     local key file).
   - Variables → **FIREBASE_PROJECT_ID** and **CALENDAR_ID** (printed by the
     setup script).
5. Paste the calendar ID into `app/src/config.ts` so Settings shows it.
6. Housemates: Google Calendar → Settings → Add calendar → **Subscribe to
   calendar** → paste the calendar ID.

The sync runs daily; after a swap or new trip, trigger it immediately via
Actions → "Sync Google Calendar" → Run workflow.

### 6. First run

Each housemate signs in once (Google popup). Then one person opens
**Settings**, adjusts the chore list and rotation order, and saves — the rota
starts that week.

## Development

```sh
npm install
npm test            # rota engine tests
npm run dev         # app at localhost:5173
npm run build       # typecheck + production build
```

## Security notes

- The Firebase web config in `app/src/firebaseConfig.ts` is public by design;
  access control lives entirely in `firebase/firestore.rules`.
- The service account key must only ever exist in GitHub Secrets (the
  `.gitignore` defensively excludes key-like JSON files). The SA can only
  *read* Firestore and edit its own calendar.
- Never put any write-capable token in `app/` — everything there ships to a
  public site.
