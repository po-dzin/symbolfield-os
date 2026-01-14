-- sf_v0.5_patch_ritual_xp_r1.sql
-- Adds minimal RitualEntry + XP ledger tables for v0.5.
-- NOTE: Add/adjust RLS policies to match your auth pattern (auth.uid()).

-- 1) Ritual entries
CREATE TABLE IF NOT EXISTS public.ritual_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id        uuid NULL REFERENCES public.spaces(id) ON DELETE SET NULL,
  ritual_type     text NOT NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  duration_min    int NOT NULL CHECK (duration_min > 0),
  note            text NULL,
  linked_node_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],

  -- optional overrides
  xp_override_axis  text NULL,   -- 'HP'|'EP'|'MP'|'SP'|'QNP'
  xp_override_delta numeric NULL,

  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ritual_entries_user_time ON public.ritual_entries(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ritual_entries_space_time ON public.ritual_entries(space_id, started_at DESC);

-- 2) XP ledger (immutable deltas)
CREATE TABLE IF NOT EXISTS public.xp_ledger_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  axis         text NOT NULL,        -- 'HP'|'EP'|'MP'|'SP'|'QNP'
  delta        numeric NOT NULL,
  reason       text NOT NULL DEFAULT 'ritual',
  source_table text NULL DEFAULT 'ritual_entries',
  source_id    uuid NULL,
  ts           timestamptz NOT NULL DEFAULT now(),
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_ts ON public.xp_ledger_entries(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_axis_ts ON public.xp_ledger_entries(user_id, axis, ts DESC);

-- 3) Simple totals view
CREATE OR REPLACE VIEW public.xp_totals AS
SELECT
  user_id,
  axis,
  COALESCE(SUM(delta), 0) AS total
FROM public.xp_ledger_entries
GROUP BY user_id, axis;

-- 4) Map ritual_type -> axis+rate (tunable)
CREATE TABLE IF NOT EXISTS public.ritual_xp_rates (
  ritual_type text PRIMARY KEY,
  axis        text NOT NULL,
  rate_per_min numeric NOT NULL
);

INSERT INTO public.ritual_xp_rates (ritual_type, axis, rate_per_min) VALUES
  ('meditation','SP',1.0),
  ('breathwork','SP',1.0),
  ('somatic_flow','HP',1.0),
  ('workout_hiit','HP',1.2),
  ('deep_work','MP',1.0),
  ('creative_jam','EP',1.0)
ON CONFLICT (ritual_type) DO NOTHING;

-- 5) Trigger: ritual insert -> xp ledger insert (unless override specified)
CREATE OR REPLACE FUNCTION public.fn_ritual_to_xp_ledger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_axis text;
  v_rate numeric;
  v_delta numeric;
BEGIN
  IF NEW.xp_override_axis IS NOT NULL AND NEW.xp_override_delta IS NOT NULL THEN
    v_axis := NEW.xp_override_axis;
    v_delta := NEW.xp_override_delta;
  ELSE
    SELECT axis, rate_per_min INTO v_axis, v_rate
    FROM public.ritual_xp_rates
    WHERE ritual_type = NEW.ritual_type;

    IF v_axis IS NULL THEN
      v_axis := 'SP';
      v_rate := 1.0;
    END IF;

    v_delta := NEW.duration_min * v_rate;
  END IF;

  INSERT INTO public.xp_ledger_entries (user_id, axis, delta, reason, source_table, source_id, ts, metadata)
  VALUES (NEW.user_id, v_axis, v_delta, 'ritual', 'ritual_entries', NEW.id, NEW.started_at, jsonb_build_object('ritual_type', NEW.ritual_type));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ritual_to_xp_ledger ON public.ritual_entries;
CREATE TRIGGER trg_ritual_to_xp_ledger
AFTER INSERT ON public.ritual_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_ritual_to_xp_ledger();
