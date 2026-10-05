# API and migration tests

These run the **real** `netlify/functions/api.mts` and the SQL in `neon/migrations/` against an
in-memory Postgres ([PGlite](https://pglite.dev)), connected as the restricted `nuts_app` role, so row
level security is enforced exactly as in production. Nothing here touches Neon or your `.env`.

They cover: notifications, mentions, watching, per-user stars, saved views, bulk edits, workflows,
delete permissions, cross-organization attacks (a user in org B against org A's data), input
validation, and what happens when the app is deployed *before* migration 006 is run.

```bash
npm install                 # the app's dependencies (provides esbuild)
cd tests/api && npm install # PGlite, kept separate from the app so Netlify never installs it
npm test
```

Run these after changing `netlify/functions/api.mts` or anything in `neon/migrations/`.
