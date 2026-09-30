-- ====================================================================
-- NUTS (Neuro Unified Ticketing System) - Neon Serverless Postgres Schema
-- Migration: 001_init_nuts_schema.sql
-- Compatible with: Neon Serverless Postgres (console.neon.tech)
-- ====================================================================

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

-- 2. USER PROFILES
-- Stores team member names, nicknames, department-specific roles, and external avatar links
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    nickname TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'Member',
    department TEXT NOT NULL DEFAULT 'Engineering',
    avatar_url TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles(nickname);

-- 3. ISSUES / TICKETS
-- High-performance: custom_attributes JSONB stores dynamic department-defined values.
-- Indexed via PostgreSQL GIN index for high-speed attribute lookups and queries.
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number SERIAL,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'ACCEPTED', 'FIXED', 'VERIFIED', 'CLOSED')),
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    issue_type TEXT CHECK (issue_type IN ('Bug', 'Feature')),
    environment TEXT CHECK (environment IN ('LOCAL', 'STAGING', 'PROD')),
    dev_scope TEXT CHECK (dev_scope IN ('frontend', 'backend', 'both')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    starred BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_department ON public.issues(department_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_custom_attributes ON public.issues USING GIN (custom_attributes);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON public.issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON public.issues(created_at DESC);

-- 4. COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT DEFAULT '',
    status_change TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_issue ON public.comments(issue_id);

-- 5. ISSUE PROPERTY CHANGE HISTORY / AUDIT LOG (Append-only audit trail)
CREATE TABLE IF NOT EXISTS public.issue_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 7. AUTO-GENERATE ISSUE CODE (e.g. DEV-101, DEV-102)
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
    actor UUID := NEW.reporter_id;
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

    IF (OLD.issue_type IS DISTINCT FROM NEW.issue_type) THEN
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Issue Type', OLD.issue_type, NEW.issue_type, 'Changed Issue Type from ' || COALESCE(OLD.issue_type, 'None') || ' to ' || COALESCE(NEW.issue_type, 'None'));
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_issue_changes ON public.issues;
CREATE TRIGGER trigger_track_issue_changes
AFTER UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.track_issue_changes();

-- 9. DEFAULT SEED DATA
-- Default Engineering department (companies can add their own custom departments & fields anytime)
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

-- Initial Team Profiles
INSERT INTO public.profiles (id, email, name, nickname, role, department, avatar_url, is_admin)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'liam@nuts.internal', 'Liam Vance', 'liam', 'Staff Systems Architect', 'Engineering', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'alex@nuts.internal', 'Alex Rivera', 'arivera', 'Senior Frontend Engineer', 'Engineering', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', FALSE),
    ('33333333-3333-3333-3333-333333333333', 'maya@nuts.internal', 'Maya Chen', 'maya', 'Lead UI/UX Engineer', 'Engineering', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', FALSE),
    ('44444444-4444-4444-4444-444444444444', 'david@nuts.internal', 'David Miller', 'dmiller', 'Infrastructure & Backend Engineer', 'Engineering', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', FALSE),
    ('55555555-5555-5555-5555-555555555555', 'elena@nuts.internal', 'Elena Rostova', 'elena', 'DevOps & Security Lead', 'Engineering', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', FALSE)
ON CONFLICT (email) DO NOTHING;
