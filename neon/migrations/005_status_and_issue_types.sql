-- ====================================================================
-- NUTS - Migration: 005_status_and_issue_types.sql
-- * Status FIXED is now COMPLETED, and a new status PENDING exists.
-- * Issue types gain "Update" and "Adjustment" (alongside Bug and Feature).
--
-- Run this before deploying the matching application version: the API now writes
-- PENDING / COMPLETED and the new issue types, which the old CHECK constraints reject.
-- Safe to re-run.
-- ====================================================================

BEGIN;

-- 1. Drop the old CHECK constraints (their names are auto-generated, so look them up).
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.issues'::regclass
          AND contype = 'c'
          AND (pg_get_constraintdef(oid) ILIKE '%status%' OR pg_get_constraintdef(oid) ILIKE '%issue_type%')
    LOOP
        EXECUTE format('ALTER TABLE public.issues DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

-- 2. Rename FIXED -> COMPLETED in existing data. The change-tracking trigger is paused so
--    this bulk rename doesn't write a fake "status changed" entry on every ticket.
ALTER TABLE public.issues DISABLE TRIGGER trigger_track_issue_changes;
UPDATE public.issues SET status = 'COMPLETED' WHERE status = 'FIXED';
ALTER TABLE public.issues ENABLE TRIGGER trigger_track_issue_changes;

UPDATE public.issue_history
SET old_value = CASE WHEN old_value = 'FIXED' THEN 'COMPLETED' ELSE old_value END,
    new_value = CASE WHEN new_value = 'FIXED' THEN 'COMPLETED' ELSE new_value END,
    message   = regexp_replace(message, '\yFIXED\y', 'COMPLETED', 'g')
WHERE field_name = 'Status'
  AND (old_value = 'FIXED' OR new_value = 'FIXED');

UPDATE public.comments
SET status_change = regexp_replace(status_change, '\yFIXED\y', 'COMPLETED', 'g')
WHERE status_change ~ '\yFIXED\y';

-- 3. New CHECK constraints.
ALTER TABLE public.issues
    ADD CONSTRAINT issues_status_check
    CHECK (status IN ('NEW', 'ASSIGNED', 'ACCEPTED', 'PENDING', 'COMPLETED', 'VERIFIED', 'CLOSED'));

ALTER TABLE public.issues
    ADD CONSTRAINT issues_issue_type_check
    CHECK (issue_type IN ('Bug', 'Feature', 'Update', 'Adjustment'));

-- 4. Existing departments keep their own copy of the Issue Type field in custom_fields.
--    * Add the new options wherever the field still has the original Bug/Feature list.
--    * Turn on "show as a filter" for it unless an admin already set that either way, so
--      existing Engineering departments keep the Type filter on the issue list.
UPDATE public.departments d
SET custom_fields = (
    SELECT jsonb_agg(
               CASE
                   WHEN f->>'id' = 'issueType' THEN
                       (CASE
                            WHEN f->'options' = '["Bug", "Feature"]'::jsonb
                            THEN jsonb_set(f, '{options}', '["Bug", "Feature", "Update", "Adjustment"]'::jsonb)
                            ELSE f
                        END)
                       || (CASE WHEN f ? 'showAsFilter' THEN '{}'::jsonb ELSE '{"showAsFilter": true}'::jsonb END)
                   ELSE f
               END
               ORDER BY ord)
    FROM jsonb_array_elements(d.custom_fields) WITH ORDINALITY AS t(f, ord)
)
WHERE jsonb_typeof(d.custom_fields) = 'array'
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(d.custom_fields) AS e(f)
      WHERE e.f->>'id' = 'issueType'
  );

COMMIT;
