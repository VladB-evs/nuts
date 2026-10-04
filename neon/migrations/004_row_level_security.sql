-- ====================================================================
-- NUTS - Migration: 004_row_level_security.sql
--
-- 1. Brings the schema in line with what the API used to patch in at runtime
--    (the API no longer runs DDL — it connects as a restricted role).
-- 2. Removes legacy org-less seed rows (nothing references them; demo mode is
--    client-side mock data).
-- 3. Creates the restricted `nuts_app` role and enables Row Level Security so a
--    bug in the API can't read or write another organization's data.
--
-- Run as the database OWNER (e.g. in the Neon SQL Editor). Afterwards set a
-- password for the app role, then point the API's DATABASE_URL at it:
--     ALTER ROLE nuts_app PASSWORD '<long random password>';
-- Keep the owner connection string for migrations only — never set it in Netlify.
--
-- How it works: every API request runs in a transaction that first does
--     set_config('app.org_id', '<caller org>', true)
-- and the policies below only allow rows of that org. With no org set, nothing is
-- visible. Table owners bypass RLS (we deliberately do not FORCE it), which is why the
-- API must NOT connect as the owner. Four SECURITY DEFINER functions cover the few
-- lookups that happen before an org is known (session, login, invite code, logout).
--
-- Statements are separated by `-- ;;` lines so scripts can split them safely.
-- ====================================================================

-- ---- 1. Schema sync -------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
-- ;;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- ;;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
-- ;;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
-- ;;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS departure_reason TEXT;
-- ;;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ;
-- ;;
ALTER TABLE public.profiles ALTER COLUMN department DROP NOT NULL;
-- ;;
ALTER TABLE public.profiles ALTER COLUMN department SET DEFAULT '';
-- ;;
ALTER TABLE public.sessions ALTER COLUMN org_id DROP NOT NULL;
-- ;;
CREATE TABLE IF NOT EXISTS public.auth_attempts (
    id BIGSERIAL PRIMARY KEY,
    kind TEXT NOT NULL,
    key_kind TEXT NOT NULL,
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ;;
CREATE INDEX IF NOT EXISTS idx_auth_attempts_lookup ON public.auth_attempts(kind, key_kind, key, created_at);
-- ;;

-- ---- 2. Remove legacy org-less rows ----------------------------------
DELETE FROM public.profiles WHERE org_id IS NULL;
-- ;;
DELETE FROM public.issues WHERE org_id IS NULL;
-- ;;
DELETE FROM public.departments WHERE org_id IS NULL;
-- ;;

-- ---- 3. Restricted application role ---------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nuts_app') THEN
        CREATE ROLE nuts_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
    END IF;
END
$$;
-- ;;
GRANT USAGE ON SCHEMA public TO nuts_app;
-- ;;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.organizations, public.departments, public.issues, public.comments,
    public.issue_history, public.sessions, public.auth_attempts
TO nuts_app;
-- ;;
-- profiles: the app role can never read password hashes (login uses a definer function).
GRANT INSERT, UPDATE, DELETE ON public.profiles TO nuts_app;
-- ;;
GRANT SELECT (id, email, name, nickname, role, department, avatar_url, is_admin,
              created_at, updated_at, org_id, status, departure_reason, departed_at)
    ON public.profiles TO nuts_app;
-- ;;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nuts_app;
-- ;;

-- ---- 4. Row Level Security ------------------------------------------
CREATE OR REPLACE FUNCTION public.app_org_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.org_id', true), '')::uuid $$;
-- ;;
GRANT EXECUTE ON FUNCTION public.app_org_id() TO nuts_app;
-- ;;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.organizations;
-- ;;
CREATE POLICY org_isolation ON public.organizations FOR ALL TO nuts_app
    USING (id = public.app_org_id()) WITH CHECK (id = public.app_org_id());
-- ;;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.profiles;
-- ;;
CREATE POLICY org_isolation ON public.profiles FOR ALL TO nuts_app
    USING (org_id = public.app_org_id()) WITH CHECK (org_id = public.app_org_id());
-- ;;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.departments;
-- ;;
CREATE POLICY org_isolation ON public.departments FOR ALL TO nuts_app
    USING (org_id = public.app_org_id()) WITH CHECK (org_id = public.app_org_id());
-- ;;

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.issues;
-- ;;
CREATE POLICY org_isolation ON public.issues FOR ALL TO nuts_app
    USING (org_id = public.app_org_id()) WITH CHECK (org_id = public.app_org_id());
-- ;;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.sessions;
-- ;;
CREATE POLICY org_isolation ON public.sessions FOR ALL TO nuts_app
    USING (org_id = public.app_org_id()) WITH CHECK (org_id = public.app_org_id());
-- ;;

-- comments and history have no org_id: they follow their issue (which is itself under RLS).
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.comments;
-- ;;
CREATE POLICY org_isolation ON public.comments FOR ALL TO nuts_app
    USING (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = comments.issue_id))
    WITH CHECK (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = comments.issue_id));
-- ;;

ALTER TABLE public.issue_history ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS org_isolation ON public.issue_history;
-- ;;
CREATE POLICY org_isolation ON public.issue_history FOR ALL TO nuts_app
    USING (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_history.issue_id))
    WITH CHECK (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_history.issue_id));
-- ;;

-- auth_attempts holds only hashed emails/IPs and is used before any org is known,
-- so the policy is deliberately permissive (RLS is still on, so other roles see nothing).
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
-- ;;
DROP POLICY IF EXISTS app_access ON public.auth_attempts;
-- ;;
CREATE POLICY app_access ON public.auth_attempts FOR ALL TO nuts_app USING (true) WITH CHECK (true);
-- ;;

-- ---- 5. Pre-org lookups (SECURITY DEFINER, owner-run) -----------------
CREATE OR REPLACE FUNCTION public.app_lookup_session(p_token_hash text)
RETURNS TABLE (
    id uuid, org_id uuid, name text, nickname text, email text, role text, department text,
    avatar_url text, is_admin boolean, status text, departure_reason text, departed_at timestamptz,
    organization_id uuid, organization_name text, organization_code text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT p.id, p.org_id, p.name, p.nickname, p.email, p.role, p.department,
           p.avatar_url, p.is_admin, p.status, p.departure_reason, p.departed_at,
           o.id, o.name, o.code
    FROM public.sessions s
    JOIN public.profiles p ON s.user_id = p.id
    LEFT JOIN public.organizations o ON o.id = p.org_id
    WHERE s.token = p_token_hash AND s.expires_at > NOW()
    LIMIT 1
$$;
-- ;;
CREATE OR REPLACE FUNCTION public.app_lookup_login(p_email text)
RETURNS TABLE (
    id uuid, org_id uuid, name text, nickname text, email text, role text, department text,
    avatar_url text, is_admin boolean, status text, departure_reason text, departed_at timestamptz,
    password_hash text,
    organization_id uuid, organization_name text, organization_code text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT p.id, p.org_id, p.name, p.nickname, p.email, p.role, p.department,
           p.avatar_url, p.is_admin, p.status, p.departure_reason, p.departed_at,
           p.password_hash,
           o.id, o.name, o.code
    FROM public.profiles p
    LEFT JOIN public.organizations o ON o.id = p.org_id
    WHERE LOWER(p.email) = LOWER(p_email)
    LIMIT 1
$$;
-- ;;
CREATE OR REPLACE FUNCTION public.app_find_org_by_code(p_code text)
RETURNS TABLE (id uuid, name text, code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT o.id, o.name, o.code FROM public.organizations o WHERE UPPER(o.code) = UPPER(p_code) LIMIT 1
$$;
-- ;;
CREATE OR REPLACE FUNCTION public.app_delete_session(p_token_hash text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    DELETE FROM public.sessions WHERE token = p_token_hash
$$;
-- ;;
REVOKE ALL ON FUNCTION public.app_lookup_session(text), public.app_lookup_login(text),
    public.app_find_org_by_code(text), public.app_delete_session(text) FROM PUBLIC;
-- ;;
GRANT EXECUTE ON FUNCTION public.app_lookup_session(text), public.app_lookup_login(text),
    public.app_find_org_by_code(text), public.app_delete_session(text) TO nuts_app;
