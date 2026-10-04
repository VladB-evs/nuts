-- ====================================================================
-- NUTS - Migration: 003_history_actor_attribution.sql
-- Attribute issue history to the person who made the change, and record
-- assignee changes by name instead of raw UUID.
--
-- The API sets the transaction-local setting `nuts.actor_id` before it updates an
-- issue. Writes that don't set it fall back to the issue's reporter, as before.
-- (The API also applies this function automatically on start-up.)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.track_issue_changes()
RETURNS TRIGGER AS $$
DECLARE
    actor UUID := COALESCE(NULLIF(current_setting('nuts.actor_id', true), '')::uuid, NEW.reporter_id);
    old_assignee TEXT;
    new_assignee TEXT;
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
        SELECT name INTO old_assignee FROM public.profiles WHERE id = OLD.assignee_id;
        SELECT name INTO new_assignee FROM public.profiles WHERE id = NEW.assignee_id;
        INSERT INTO public.issue_history (issue_id, actor_id, field_name, old_value, new_value, message)
        VALUES (NEW.id, actor, 'Assignee', COALESCE(old_assignee, 'Unassigned'), COALESCE(new_assignee, 'Unassigned'),
                'Reassigned ticket from ' || COALESCE(old_assignee, 'Unassigned') || ' to ' || COALESCE(new_assignee, 'Unassigned'));
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
