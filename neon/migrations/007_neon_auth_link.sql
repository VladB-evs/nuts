-- ====================================================================
-- NUTS - Migration: 007_neon_auth_link.sql
--
-- Prepares the database for sign-in through Neon Auth (Managed Better Auth).
--
-- Neon Auth owns passwords and sessions. The app keeps its own `profiles` row (organization,
-- role, department, admin flag) and links it to the Neon Auth user through `auth_user_id`, the
-- `sub` claim of the signed token.
--
--   profiles.auth_user_id          the Neon Auth user this profile belongs to (unique)
--   app_lookup_auth_user(sub)      find the profile for a verified token, before any org is known
--   app_link_auth_user(sub,email)  attach an existing (pre-Neon-Auth) profile to its Neon Auth
--                                  user, matched on a VERIFIED email. Only ever links a profile
--                                  that has no link yet.
--
-- Both functions are SECURITY DEFINER for the same reason as app_lookup_session in 004: the
-- restricted app role can't see rows until an organization is known. They are granted to
-- `nuts_app` only.
--
-- Safe to run before the app uses Neon Auth: it changes nothing for the current login.
-- Run as the database OWNER (Neon SQL Editor), after 006. Safe to re-run.
-- Statements are separated by `-- ;;` lines so scripts can split them safely.
-- ====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
-- ;;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id
    ON public.profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;
-- ;;
GRANT SELECT (auth_user_id) ON public.profiles TO nuts_app;
-- ;;

CREATE OR REPLACE FUNCTION public.app_lookup_auth_user(p_sub text)
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
    FROM public.profiles p
    LEFT JOIN public.organizations o ON o.id = p.org_id
    WHERE p.auth_user_id = p_sub AND p.org_id IS NOT NULL
    LIMIT 1
$$;
-- ;;

-- The caller must only pass an email Neon Auth has verified. Links at most one profile, and only
-- one that is not linked yet, so a second Neon Auth user can never take over a linked account.
CREATE OR REPLACE FUNCTION public.app_link_auth_user(p_sub text, p_email text)
RETURNS TABLE (
    id uuid, org_id uuid, name text, nickname text, email text, role text, department text,
    avatar_url text, is_admin boolean, status text, departure_reason text, departed_at timestamptz,
    organization_id uuid, organization_name text, organization_code text
)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    WITH linked AS (
        UPDATE public.profiles
        SET auth_user_id = p_sub, updated_at = NOW()
        WHERE id = (
            SELECT p2.id FROM public.profiles p2
            WHERE lower(p2.email) = lower(p_email)
              AND p2.auth_user_id IS NULL
              AND p2.org_id IS NOT NULL
            LIMIT 1
        )
        AND NOT EXISTS (SELECT 1 FROM public.profiles x WHERE x.auth_user_id = p_sub)
        RETURNING *
    )
    SELECT l.id, l.org_id, l.name, l.nickname, l.email, l.role, l.department,
           l.avatar_url, l.is_admin, l.status, l.departure_reason, l.departed_at,
           o.id, o.name, o.code
    FROM linked l
    LEFT JOIN public.organizations o ON o.id = l.org_id
$$;
-- ;;

REVOKE ALL ON FUNCTION public.app_lookup_auth_user(text), public.app_link_auth_user(text, text) FROM PUBLIC;
-- ;;
GRANT EXECUTE ON FUNCTION public.app_lookup_auth_user(text), public.app_link_auth_user(text, text) TO nuts_app;
-- ;;
