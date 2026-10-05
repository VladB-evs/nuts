# NUTS — Neuro Unified Ticketing System

> **Universal, lightning-fast issue tracking for modern teams.** Built with Google Buganizer aesthetics, high-density monochrome UI, and powered by **Neon Serverless Postgres**.

---

## ⚡ Core Features

- **Google Buganizer Minimalist Aesthetic**:
  - High-density issue table with status chips (`NEW`, `ASSIGNED`, `ACCEPTED`, `PENDING`, `COMPLETED`, `VERIFIED`, `CLOSED`) and priority markers (`P0`, `P1`, `P2`, `P3`).
  - Clean split view / master-detail pane with comment stream and activity audit log.
  - Quick-action status dropdowns and assignee reassignment.

- **Dynamic Department Custom Fields**:
  - Starts with **Engineering (`DEV`)** as the primary default department, featuring `issueType` (Bug, Feature, Update or Adjustment), `environment` (LOCAL, STAGING, PROD), and `devScope`.
  - Add, edit, and reorder custom department properties dynamically without database schema migrations.
  - Dynamic fields automatically populate into every ticket belonging to that department.

- **Team Profiles & Hover Cards**:
  - Unique team `@nickname`, department roles (e.g., *Lead Platform Engineer*, *Senior Frontend*), and external avatar image links (zero file upload friction).
  - Interactive profile card on hover over any user avatar or name across the app.

- **Neon Serverless Postgres Architecture**:
  - Powered by `@neondatabase/serverless` using fast HTTP queries, **server-side only** (see Security).
  - JSONB attributes with PostgreSQL GIN indexing for fast custom field queries.
  - Automatic ticket code generation (`DEV-101`, `DEV-102`...) and change tracking triggers.
  - Sandbox demo mode with mock data, no database required.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **API**: a single Netlify Function (`netlify/functions/api.mts`) — the only code that talks to the database.
- **Database**: Neon Serverless Postgres (`@neondatabase/serverless`).
- **Deployment**: Netlify (pre-configured with `netlify.toml`).

---

## 🚀 Getting Started

### 1. Run Locally

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production

```bash
npm run build
```

---

## 🔒 Security Model

The browser never sees database credentials, and the database enforces tenant isolation itself.

- **Server-only credentials.** `DATABASE_URL` is a server environment variable. Never give it a `VITE_` prefix —
  Vite inlines `VITE_*` variables into the public JavaScript bundle.
- **API + session cookie.** The browser calls `POST /api` with `{ action, args }`. Identity comes from an
  **HttpOnly, SameSite=Strict session cookie**; the server looks up the user and organization from it and ignores
  any identity sent by the client. Admin-only actions are enforced on the server, and the workspace can't be left
  without an active admin.
- **Row Level Security.** Every table has RLS. The API connects as a restricted role, `nuts_app` (no superuser,
  no `BYPASSRLS`, no schema changes, and it can't read `password_hash`). Each request runs in a transaction that
  first sets `app.org_id`; the policies only allow that organization's rows, and with no org set nothing is visible.
  So even a bug in the API (say, a query that forgets its `WHERE org_id`) can't leak or modify another org's data.
  A few lookups that must happen before an org is known (session, login, invite code, logout) go through four narrow
  `SECURITY DEFINER` functions.
- **Passwords & sessions.** Passwords use **scrypt** with a per-user salt; session tokens are random and stored only as
  SHA-256 hashes. Failed logins and invite-code guesses are rate-limited (5 per email / 20 per IP per 15 minutes).

> **Owner vs app role.** Table owners bypass RLS, so the API must never connect as `neondb_owner`. Keep the owner
> connection string for migrations only and never set it in Netlify. New tables need their own RLS policy and a
> `GRANT ... TO nuts_app` in the migration that creates them.

---

## 🗄 Neon Serverless Postgres Setup

1. Create a project at [Neon](https://console.neon.tech).
2. In the **SQL Editor** (which runs as the owner), run the migrations in `neon/migrations/` in order:
   `001` → `002` → `003` → `004` → `005`. Migration `004` creates the `nuts_app` role and enables RLS.
3. Give the app role a password (it's created without one):
   ```sql
   ALTER ROLE nuts_app PASSWORD 'a-long-random-password';
   ```
   > Create the role via migration/SQL as above — roles created in the Neon console join `neon_superuser`, which bypasses RLS.
4. Create a `.env` file in the root directory (it is gitignored) with two connection strings for the same host:
   ```env
   DATABASE_URL=postgresql://nuts_app:a-long-random-password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   DATABASE_ADMIN_URL=postgresql://neondb_owner:...@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
5. Run `npm run dev`. The Vite dev server serves the same API handler at `/api`, so no Netlify CLI is needed locally.

---

## 🌐 Deploy to Netlify

`netlify.toml` builds the app, publishes `dist`, bundles `netlify/functions`, and routes `/api` to the function.

### Steps to Deploy:
1. Push your repository to GitHub.
2. Log into [Netlify](https://app.netlify.com) and click **"Add new site" → "Import an existing project"**.
3. Select your GitHub repository.
4. Under **Environment variables**, add:
   - Key: `DATABASE_URL` (no `VITE_` prefix)
   - Value: the **`nuts_app`** connection string (not the owner's). Don't add `DATABASE_ADMIN_URL`.
5. Click **Deploy NUTS**.
