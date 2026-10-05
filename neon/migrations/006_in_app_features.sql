-- ====================================================================
-- NUTS - Migration: 006_in_app_features.sql
--
-- Adds the tables behind: per-user stars, watching a ticket, saved views, in-app
-- notifications, and per-department status workflows.
--
--   issue_stars       private to each user (replaces the shared issues.starred flag,
--                     which starred a ticket for the whole organization)
--   issue_watchers    who follows a ticket; readable inside the org so the API can notify
--   saved_views       each user's saved filters; private to the user
--   notifications     one row per recipient; each user can only read/update/delete their own
--   departments.workflow  which statuses a department uses and what it calls them
--
-- Isolation is enforced in the database, not just the API:
--   * every table is under Row Level Security for the restricted `nuts_app` role
--   * org checks use app.org_id (set per request, see 004)
--   * per-user tables ALSO check nuts.actor_id, the signed-in user's id, which the API sets
--     for every request. A missing actor matches nothing.
--
-- Run as the database OWNER (Neon SQL Editor), after 005. Safe to re-run.
-- Statements are separated by `-- ;;` lines so scripts can split them safely.
-- ====================================================================

-- ---- 1. Helper: the signed-in user for this request -----------------
CREATE OR REPLACE FUNCTION public.app_actor_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('nuts.actor_id', true), '')::uuid $$;
-- ;;
GRANT EXECUTE ON FUNCTION public.app_actor_id() TO nuts_app;
-- ;;

-- ---- 2. Stars (private to each user) --------------------------------
CREATE TABLE IF NOT EXISTS public.issue_stars (
    issue_id   UUID NOT NULL REFERENCES public.issues(id)   ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);
-- ;;
CREATE INDEX IF NOT EXISTS idx_issue_stars_user ON public.issue_stars(user_id);
-- ;;
ALTER TABLE public.issue_stars ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS own_stars ON public.issue_stars;
-- ;;
CREATE POLICY own_stars ON public.issue_stars FOR ALL TO nuts_app
    USING (user_id = public.app_actor_id()
           AND EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_stars.issue_id))
    WITH CHECK (user_id = public.app_actor_id()
           AND EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_stars.issue_id));
-- ;;

-- ---- 3. Watchers ----------------------------------------------------
-- Readable across the org (the API needs every watcher of a ticket to notify them), but only
-- for tickets the org owns. The API only ever adds a user who belongs to the org.
CREATE TABLE IF NOT EXISTS public.issue_watchers (
    issue_id   UUID NOT NULL REFERENCES public.issues(id)   ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);
-- ;;
CREATE INDEX IF NOT EXISTS idx_issue_watchers_user ON public.issue_watchers(user_id);
-- ;;
ALTER TABLE public.issue_watchers ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.issue_watchers;
-- ;;
CREATE POLICY org_isolation ON public.issue_watchers FOR ALL TO nuts_app
    USING (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_watchers.issue_id)
           AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = issue_watchers.user_id))
    WITH CHECK (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_watchers.issue_id)
           AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = issue_watchers.user_id));
-- ;;

-- ---- 4. Saved views (private to each user) --------------------------
CREATE TABLE IF NOT EXISTS public.saved_views (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
    name       TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
    config     JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(config::text) <= 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ;;
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_views_user_name ON public.saved_views(user_id, lower(btrim(name)));
-- ;;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS own_views ON public.saved_views;
-- ;;
CREATE POLICY own_views ON public.saved_views FOR ALL TO nuts_app
    USING (org_id = public.app_org_id() AND user_id = public.app_actor_id())
    WITH CHECK (org_id = public.app_org_id() AND user_id = public.app_actor_id());
-- ;;

-- ---- 5. Notifications -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,  -- recipient
    actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,               -- who did it
    issue_id   UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('assigned', 'mentioned', 'commented', 'status_changed', 'priority_changed')),
    detail     TEXT CHECK (char_length(detail) <= 300),
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ;;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
-- ;;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
-- ;;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS notif_select ON public.notifications;
-- ;;
DROP POLICY IF EXISTS notif_insert ON public.notifications;
-- ;;
DROP POLICY IF EXISTS notif_update ON public.notifications;
-- ;;
DROP POLICY IF EXISTS notif_delete ON public.notifications;
-- ;;
-- Anyone in the org can create a notification for another member; only the recipient can read or change it.
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO nuts_app
    WITH CHECK (org_id = public.app_org_id()
                AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = notifications.user_id)
                AND EXISTS (SELECT 1 FROM public.issues i WHERE i.id = notifications.issue_id));
-- ;;
CREATE POLICY notif_select ON public.notifications FOR SELECT TO nuts_app
    USING (org_id = public.app_org_id() AND user_id = public.app_actor_id());
-- ;;
CREATE POLICY notif_update ON public.notifications FOR UPDATE TO nuts_app
    USING (org_id = public.app_org_id() AND user_id = public.app_actor_id())
    WITH CHECK (org_id = public.app_org_id() AND user_id = public.app_actor_id());
-- ;;
CREATE POLICY notif_delete ON public.notifications FOR DELETE TO nuts_app
    USING (org_id = public.app_org_id() AND user_id = public.app_actor_id());
-- ;;

-- ---- 6. Per-department status workflow ------------------------------
-- { "statuses": ["NEW","ASSIGNED",...], "labels": { "NEW": "Requested" } }. NULL = all statuses, default names.
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS workflow JSONB;
-- ;;

-- ---- 7. Grants ------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.issue_stars, public.issue_watchers, public.saved_views, public.notifications
TO nuts_app;
-- ;;
