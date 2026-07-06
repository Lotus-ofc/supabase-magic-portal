-- =========================================================
-- 20_content_workflow_editorial_planning.sql (aditivo, idempotente)
-- Fase 3: triggers updated_at em pilares e story plan.
-- =========================================================

CREATE OR REPLACE FUNCTION public.tg_editorial_pillars_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS editorial_pillars_touch ON public.editorial_pillars;
CREATE TRIGGER editorial_pillars_touch
  BEFORE UPDATE ON public.editorial_pillars
  FOR EACH ROW EXECUTE FUNCTION public.tg_editorial_pillars_touch();

CREATE OR REPLACE FUNCTION public.tg_story_plan_rows_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS story_plan_rows_touch ON public.story_plan_rows;
CREATE TRIGGER story_plan_rows_touch
  BEFORE UPDATE ON public.story_plan_rows
  FOR EACH ROW EXECUTE FUNCTION public.tg_story_plan_rows_touch();
