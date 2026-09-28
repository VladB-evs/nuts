# NUTS — Neuro Unified Ticketing System

> **Universal, lightning-fast ticketing system for modern startups.** Manage Engineering, Marketing, Sales, Product, and Operations tickets in a single, high-contrast monochrome workspace with intentional accent colors.

![NUTS Banner](public/nuts-logo.svg)

---

## ⚡ Core Features

- **Universal Multi-Department Architecture**:
  - **Engineering (`DEV`)**: Git branch tracking, PR links, affected environments, bug triage, tech debt tags.
  - **Marketing (`MKT`)**: Campaigns, growth channels (social, email, SEO, ads), deliverable asset links.
  - **Sales & CS (`SLS`)**: Enterprise accounts, deal sizes, sales pipeline stages, SLA targets.
  - **Product & Design (`PRD`)**: User stories, milestones, design system links.
  - **Operations & HR (`OPS`)**: Equipment provisioning, legal, financial budgets.
  - **Custom Departments**: Create any team with custom ticket code prefixes and accent colors directly in the UI.

- **High-Contrast Monochrome Design**:
  - Minimalist black-and-white aesthetic with strategic status & department accents.
  - Built-in Dark and Light mode toggle.
  - Fluid mobile-first experience with a responsive bottom navigation bar, touch-friendly sheets, and smooth horizontal scrolling.

- **Multiple Interactive Views**:
  - **Kanban Board**: Drag-and-drop status flow (`Backlog` → `To Do` → `In Progress` → `In Review` → `Done`) with confetti celebration on completion.
  - **List / Table View**: High-density view with sorting by key, summary, priority, due date, and inline status modification.
  - **Metrics & SLA Dashboard**: Real-time workload distribution, team allocation, and priority breakdown.

- **Productivity Superchargers**:
  - **Command Palette (`Cmd+K` / `Ctrl+K`)**: Instant search across tickets, departments, quick view transitions, and actions.
  - **Quick Ticket Creation (`C`)**: Template auto-fill for Bug Reports, Feature Specs, Marketing Campaigns, and Sales Deals.
  - **Interactive Checklists & Subtasks**: Real-time progress bars and task completion tracking.
  - **Persona Switcher**: Seamlessly switch between team member profiles to test workflows.
  - **Local Persistence**: State automatically saves to `localStorage` so changes persist across refreshes, with a 1-click **Reset Demo Data** button.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend / Database**: Supabase PostgreSQL + Auth (email/password), prepared with full migrations.
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

## 🗄 Supabase Backend Setup (When Ready)

The project is structured with an **offline-first prototyping mode** active by default so you can evaluate and customize the UI immediately. When you are ready to connect your live Supabase project:

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open the **SQL Editor** tab.
3. Open and copy the SQL migration from:
   ```
   supabase/migrations/20260928000000_init_nuts_schema.sql
   ```
4. Run the SQL script to create tables (`departments`, `profiles`, `tickets`, `ticket_comments`, `ticket_checklists`, `ticket_activities`), RLS security policies, auto-numbering triggers, and seed data.
5. Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Restart the dev server or deploy. NUTS will automatically detect your Supabase credentials!

---

## 🌐 Deploy to Netlify

The repository includes `netlify.toml` with SPA redirects configured:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

To deploy:
- **Via Git**: Push to GitHub/GitLab and link your repo in [Netlify](https://app.netlify.com).
- **Via Netlify CLI**:
  ```bash
  npm install -g netlify-cli
  netlify deploy --prod --dir=dist
  ```
