-- sf_v0.5 patch: add EventLogEntry (append-only)
-- File: sf_v0.5_patch_eventlog_r1.sql

create table if not exists public.event_log_entries (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  user_id uuid not null,
  space_id uuid null references public.spaces(id) on delete set null,

  -- snapshot address for deep links / audit (optional)
  address jsonb null,

  action_type text not null,
  entity_kind text null,
  entity_id uuid null,

  payload jsonb not null default '{}'::jsonb,
  undo jsonb null,
  meta jsonb null
);

create index if not exists event_log_entries_ts_idx on public.event_log_entries (ts desc);
create index if not exists event_log_entries_user_ts_idx on public.event_log_entries (user_id, ts desc);
create index if not exists event_log_entries_space_ts_idx on public.event_log_entries (space_id, ts desc);
create index if not exists event_log_entries_action_type_idx on public.event_log_entries (action_type);

-- optional: quick filter by entity_id (for node history)
create index if not exists event_log_entries_entity_idx on public.event_log_entries (entity_id);

-- NOTE: RLS policies should be added consistent with the rest of the schema (not included here).
