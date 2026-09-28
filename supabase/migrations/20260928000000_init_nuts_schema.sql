-- ====================================================================
-- NUTS (Neuro Unified Ticketing System) - Simple Issue Tracker Schema
-- Migration: 20260928000000_init_nuts_schema.sql
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DEPARTMENTS / COMPONENTS
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER PROFILES (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT DEFAULT 'Engineering',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ISSUES / TICKETS
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number SERIAL,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'ACCEPTED', 'FIXED', 'VERIFIED', 'CLOSED')),
    -- Engineering rules
    environment TEXT CHECK (environment IN ('LOCAL', 'STAGING', 'PROD')),
    dev_scope TEXT CHECK (dev_scope IN ('frontend', 'backend', 'both')),
    -- Marketing rules
    marketing_channel TEXT,
    deliverable_type TEXT,
    -- Sales rules
    deal_segment TEXT,
    deal_stage TEXT,
    -- Operations rules
    ops_category TEXT,
    impact_level TEXT,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_department ON public.issues(department_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_environment ON public.issues(environment);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON public.issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON public.issues(created_at DESC);

-- 4. COMMENTS & HISTORY
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT DEFAULT '',
    status_change TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_issue ON public.comments(issue_id);

-- 5. AUTO-UPDATE UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_issues_updated_at ON public.issues;
CREATE TRIGGER set_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. AUTO-GENERATE ISSUE CODE (e.g. DEV-101, MKT-102)
CREATE OR REPLACE FUNCTION public.generate_issue_code()
RETURNS TRIGGER AS $$
DECLARE
    dept_code TEXT;
    next_num INT;
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        SELECT code INTO dept_code FROM public.departments WHERE id = NEW.department_id;
        IF dept_code IS NULL THEN
            dept_code := 'NUTS';
        END IF;
        
        SELECT COALESCE(MAX(SUBSTRING(code FROM '[0-9]+')::INT), 100) + 1 INTO next_num
        FROM public.issues
        WHERE department_id = NEW.department_id;

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

-- 7. NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, department)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'Engineering'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow authenticated read issues" ON public.issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update issues" ON public.issues FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete issues" ON public.issues FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage comments" ON public.comments FOR ALL TO authenticated USING (true);

-- 9. DEFAULT DEPARTMENTS SEED
INSERT INTO public.departments (id, name, code)
VALUES 
    ('engineering', 'Engineering', 'DEV'),
    ('marketing', 'Marketing', 'MKT'),
    ('sales', 'Sales & CS', 'SLS'),
    ('product', 'Product', 'PRD'),
    ('operations', 'Operations', 'OPS')
ON CONFLICT (id) DO NOTHING;
