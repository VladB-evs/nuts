-- ====================================================================
-- NUTS (Neuro Unified Ticketing System) - Neon Serverless Postgres Migration
-- Migration: 002_multi_tenant_organizations.sql
-- Adds Multi-Tenant Organization Isolation, Secure Sessions & Code Scoping
-- ====================================================================

-- 1. ORGANIZATIONS (Companies / Workspaces)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- e.g. "ACME-9021"
    created_by_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_code ON public.organizations(code);

-- 2. LINK PROFILES TO ORGANIZATIONS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);

-- 3. SECURE AUTH SESSIONS
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- 4. LINK DEPARTMENTS TO ORGANIZATIONS
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_departments_org_id ON public.departments(org_id);
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_code_key;

-- 5. LINK ISSUES TO ORGANIZATIONS
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_issues_org_id ON public.issues(org_id);
ALTER TABLE public.issues DROP CONSTRAINT IF EXISTS issues_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_org_code ON public.issues(COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

-- 6. UPDATE ISSUE CODE GENERATOR (Scoped per organization)
CREATE OR REPLACE FUNCTION public.generate_issue_code()
RETURNS TRIGGER AS $$
DECLARE
    dept_code TEXT;
    next_num INT;
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        SELECT code INTO dept_code FROM public.departments WHERE id = NEW.department_id;
        IF dept_code IS NULL THEN
            dept_code := 'DEV';
        END IF;
        
        SELECT COALESCE(MAX(SUBSTRING(code FROM '[0-9]+')::INT), 100) + 1 INTO next_num
        FROM public.issues
        WHERE department_id = NEW.department_id
          AND (org_id = NEW.org_id OR (org_id IS NULL AND NEW.org_id IS NULL));

        NEW.code := dept_code || '-' || next_num;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_issue_code ON public.issues;
CREATE TRIGGER set_issue_code
BEFORE INSERT ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.generate_issue_code();
