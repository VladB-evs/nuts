-- ====================================================================
-- NUTS (Neuro Unified Ticketing System) - Initial Supabase Schema
-- Migration: 20260928000000_init_nuts_schema.sql
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#ffffff',
    icon TEXT NOT NULL DEFAULT 'Layers',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'Member',
    department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number SERIAL,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    estimate_hours NUMERIC(6, 2),
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_tickets_department ON public.tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON public.tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);

-- 4. TICKET CHECKLISTS
CREATE TABLE IF NOT EXISTS public.ticket_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_checklists_ticket ON public.ticket_checklists(ticket_id);

-- 5. TICKET COMMENTS
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

-- 6. TICKET ACTIVITY LOG
CREATE TABLE IF NOT EXISTS public.ticket_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket ON public.ticket_activities(ticket_id);

-- 7. FUNCTION & TRIGGER: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tickets_updated_at ON public.tickets;
CREATE TRIGGER set_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 8. FUNCTION & TRIGGER: Auto-generate Ticket Code (e.g. DEV-1, MKT-2)
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
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
        
        SELECT COALESCE(MAX(SUBSTRING(code FROM '[0-9]+')::INT), 0) + 1 INTO next_num
        FROM public.tickets
        WHERE department_id = NEW.department_id;

        NEW.code := dept_code || '-' || next_num;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_code ON public.tickets;
CREATE TRIGGER set_ticket_code
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_code();

-- 9. AUTH TRIGGER: Automatically insert a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'),
        'Member'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_activities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read/write for team internal operations
CREATE POLICY "Allow authenticated read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow authenticated read tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update tickets" ON public.tickets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete tickets" ON public.tickets FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage checklists" ON public.ticket_checklists FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage comments" ON public.ticket_comments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage activities" ON public.ticket_activities FOR ALL TO authenticated USING (true);

-- 11. DEFAULT DEPARTMENTS SEED DATA
INSERT INTO public.departments (id, name, code, color, icon, description)
VALUES 
    ('engineering', 'Engineering', 'DEV', '#3b82f6', 'Code2', 'Software development, bug fixes, refactoring and infrastructure'),
    ('marketing', 'Marketing', 'MKT', '#a855f7', 'Megaphone', 'Campaigns, branding, content creation, social media and growth'),
    ('sales', 'Sales & CS', 'SLS', '#06b6d4', 'TrendingUp', 'Inbound leads, client requests, deals and customer success tickets'),
    ('product', 'Product & Design', 'PRD', '#10b981', 'Sparkles', 'Specs, UX/UI wireframes, design systems and product milestones'),
    ('operations', 'Operations & HR', 'OPS', '#f43f5e', 'ShieldAlert', 'Finances, onboarding, IT requests and office operations')
ON CONFLICT (id) DO NOTHING;
