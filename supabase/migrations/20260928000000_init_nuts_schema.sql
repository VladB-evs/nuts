-- ====================================================================
-- NUTS (Neuro Unified Ticketing System) - Simple Issue Tracker Schema
-- Migration: 20260928000000_init_nuts_schema.sql
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DEPARTMENTS (Fully Customizable)
-- Uses JSONB for custom_fields so teams can dynamically add/remove/reorder
-- custom ticket fields without requiring database DDL schema migrations.
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER PROFILES (Linked with Supabase Auth)
-- Stores nicknames, department-specific roles, and external avatar image links
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'Member',
    department TEXT NOT NULL DEFAULT 'Engineering',
    avatar_url TEXT, -- External image link only (no storage upload/bucket required)
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles(nickname);

-- 3. ISSUES / TICKETS
-- Ultra-efficient: custom_attributes JSONB stores dynamic department-defined values
-- Indexed via PostgreSQL GIN index for high-speed attribute lookups and queries with zero joins.
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number SERIAL,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'ACCEPTED', 'FIXED', 'VERIFIED', 'CLOSED')),
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Engineering rules (backward compatibility)
    issue_type TEXT CHECK (issue_type IN ('Bug', 'Feature')),
    environment TEXT CHECK (environment IN ('LOCAL', 'STAGING', 'PROD')),
    dev_scope TEXT CHECK (dev_scope IN ('frontend', 'backend', 'both')),
    -- Marketing rules (backward compatibility)
    marketing_channel TEXT,
    deliverable_type TEXT,
    -- Sales rules (backward compatibility)
    deal_segment TEXT,
    deal_stage TEXT,
    -- Operations rules (backward compatibility)
    ops_category TEXT,
    impact_level TEXT,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_department ON public.issues(department_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_custom_attributes ON public.issues USING GIN (custom_attributes);
CREATE INDEX IF NOT EXISTS idx_issues_environment ON public.issues(environment);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON public.issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON public.issues(created_at DESC);

-- 4. COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT DEFAULT '',
    status_change TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_issue ON public.comments(issue_id);

-- 5. ISSUE PROPERTY CHANGE HISTORY / AUDIT LOG (Lightweight & cheap append-only table)
CREATE TABLE IF NOT EXISTS public.issue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_history_issue_created ON public.issue_history(issue_id, created_at DESC);

-- 6. AUTO-UPDATE UPDATED_AT TRIGGER
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

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. AUTO-GENERATE ISSUE CODE (e.g. DEV-101, MKT-102)
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

-- 8. AUTOMATIC PROPERTY CHANGE TRACKING TRIGGER
CREATE OR REPLACE FUNCTION public.track_issue_changes()
RETURNS TRIGGER AS $$
DECLARE
    actor UUID := auth.uid();
BEGIN
    IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Priority', OLD.priority, NEW.priority, 'Changed Priority from ' || OLD.priority || ' to ' || NEW.priority);
    END IF;

    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Status', OLD.status, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
    END IF;

    IF (OLD.title IS DISTINCT FROM NEW.title) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Title', OLD.title, NEW.title, 'Updated title to "' || NEW.title || '"');
    END IF;

    IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Assignee', OLD.assignee_id::text, NEW.assignee_id::text, 'Reassigned ticket');
    END IF;

    IF (OLD.department_id IS DISTINCT FROM NEW.department_id) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Department', OLD.department_id, NEW.department_id, 'Moved to department ' || NEW.department_id);
    END IF;

    IF (OLD.environment IS DISTINCT FROM NEW.environment) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Environment Stage', OLD.environment, NEW.environment, 'Changed Environment Stage from ' || COALESCE(OLD.environment, 'None') || ' to ' || COALESCE(NEW.environment, 'None'));
    END IF;

    IF (OLD.dev_scope IS DISTINCT FROM NEW.dev_scope) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Development Layer', OLD.dev_scope, NEW.dev_scope, 'Changed Development Layer from ' || COALESCE(OLD.dev_scope, 'None') || ' to ' || COALESCE(NEW.dev_scope, 'None'));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_issue_changes ON public.issues;
CREATE TRIGGER trigger_track_issue_changes
AFTER UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.track_issue_changes();

-- 9. NEW USER TRIGGER
-- Automatically sets up new user profile with role, nickname, and avatar from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        nickname,
        role,
        department,
        avatar_url,
        is_admin
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        LOWER(COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Member'),
        COALESCE(NEW.raw_user_meta_data->>'department', 'Engineering'),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, FALSE)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_history ENABLE ROW LEVEL SECURITY;

-- 10.1 DEPARTMENTS POLICIES
CREATE POLICY "Allow authenticated read departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

-- 10.2 PROFILES & ROLES VISIBILITY POLICIES
-- Any authenticated organization member can view teammates' profiles, roles, and nicknames
CREATE POLICY "Allow authenticated team members to view all profiles and roles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own personal info (name, nickname, external avatar link)
CREATE POLICY "Allow users to update their own profile details"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins or Team Leads can manage and update any profile (e.g. promoting roles or moving departments)
CREATE POLICY "Allow admins to manage all member roles and profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (is_admin = TRUE OR role ILIKE '%Admin%' OR role ILIKE '%Lead%')
    )
);

-- 10.3 ISSUES POLICIES
CREATE POLICY "Allow authenticated read issues"
ON public.issues
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert issues"
ON public.issues
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update issues"
ON public.issues
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated delete issues"
ON public.issues
FOR DELETE
TO authenticated
USING (true);

-- 10.4 COMMENTS & AUDIT HISTORY POLICIES
CREATE POLICY "Allow authenticated manage comments"
ON public.comments
FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated manage issue_history"
ON public.issue_history
FOR ALL
TO authenticated
USING (true);

-- 10.5 DEPARTMENTS POLICIES (Manage & Customize Departments)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (true);

-- 11. DEFAULT DEPARTMENTS SEED (Only Engineering by default; companies can create their own)
INSERT INTO public.departments (id, name, code, description, custom_fields)
VALUES 
    (
        'engineering',
        'Engineering',
        'DEV',
        'Core software, infrastructure, and web applications',
        '[
            {"id": "issueType", "name": "Issue Type", "type": "select", "options": ["Bug", "Feature"], "defaultValue": "Bug"},
            {"id": "environment", "name": "Environment Stage", "type": "select", "options": ["LOCAL", "STAGING", "PROD"], "defaultValue": "LOCAL"},
            {"id": "devScope", "name": "Development Layer", "type": "select", "options": ["Frontend only", "Backend only", "Both (Frontend + Backend)"]}
        ]'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    custom_fields = EXCLUDED.custom_fields,
    description = EXCLUDED.description;

