# NUTS — Neuro Unified Ticketing System

> **Universal, lightning-fast issue tracking for modern teams.** Built with Google Buganizer aesthetics, high-density monochrome UI, and powered by **Neon Serverless Postgres**.

---

## ⚡ Core Features

- **Google Buganizer Minimalist Aesthetic**:
  - High-density issue table with status chips (`NEW`, `ASSIGNED`, `ACCEPTED`, `FIXED`, `VERIFIED`, `CLOSED`) and priority markers (`P0`, `P1`, `P2`, `P3`).
  - Clean split view / master-detail pane with comment stream and activity audit log.
  - Quick-action status dropdowns and assignee reassignment.

- **Dynamic Department Custom Fields**:
  - Starts with **Engineering (`DEV`)** as the primary default department, featuring `issueType` (Bug vs Feature), `environment` (LOCAL, STAGING, PROD), and `devScope`.
  - Add, edit, and reorder custom department properties dynamically without database schema migrations.
  - Dynamic fields automatically populate into every ticket belonging to that department.

- **Team Profiles & Hover Cards**:
  - Unique team `@nickname`, department roles (e.g., *Lead Platform Engineer*, *Senior Frontend*), and external avatar image links (zero file upload friction).
  - Interactive profile card on hover over any user avatar or name across the app.

- **Neon Serverless Postgres Architecture**:
  - Powered by `@neondatabase/serverless` using fast HTTP queries.
  - JSONB attributes with PostgreSQL GIN indexing for fast custom field queries.
  - Automatic ticket code generation (`DEV-101`, `DEV-102`...) and change tracking triggers.
  - Offline-first mock data fallback when running without a database connection string.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Database**: Neon Serverless Postgres (`@neondatabase/serverless`).
- **Deployment**: Netlify (pre-configured with `netlify.toml` SPA redirects).

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

## 🗄 Neon Serverless Postgres Setup

NUTS works out of the box with offline mock data. When you are ready to connect your live Neon database:

1. Create a project at [Neon](https://console.neon.tech).
2. Open the **SQL Editor** tab in the Neon Console.
3. Paste and run the migration script:
   ```sql
   neon/migrations/001_init_nuts_schema.sql
   ```
4. Copy your Postgres connection string (Pooled or Direct) from the Neon dashboard.
5. Create a `.env` file in the root directory:
   ```env
   VITE_NEON_DATABASE_URL=postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
6. Rebuild or reload the app. NUTS will automatically detect your Neon database!

---

## 🌐 Deploy to Netlify

The repository includes `netlify.toml` with build commands and SPA routing pre-configured:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Steps to Deploy:
1. Push your repository to GitHub.
2. Log into [Netlify](https://app.netlify.com) and click **"Add new site" → "Import an existing project"**.
3. Select your GitHub repository.
4. (Optional) Under **Environment variables**, add:
   - Key: `VITE_NEON_DATABASE_URL`
   - Value: Your Neon Postgres connection string.
5. Click **Deploy NUTS**.
