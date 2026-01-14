-- 0) (Optional) pgvector for future embeddings
create extension if not exists vector;

-- 1) Create 'dev' schema
create schema if not exists dev;

-- 2) Updated_at trigger function
create or replace function dev.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3) Main 'docs' table
create table if not exists dev.docs (
  id uuid primary key default gen_random_uuid(),

  -- Classification
  kind text not null,            -- 'spec', 'task', 'test_spec', 'output', 'audit'
  title text not null,           -- Filename or title
  source text not null,          -- Unique path (e.g. docs/specs/PRD.md or artifacts/UUID/task.md)

  -- Payload
  content text not null,

  -- Safety / Idempotency (DB-side generated hash)
  content_hash text generated always as (md5(content)) stored,

  -- Flexible Metadata
  meta jsonb not null default '{}'::jsonb,

  -- (Optional) Embeddings
  embedding vector(1536),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Data Cleanup & Migration (Run before constraints)

-- Fix 1: Canonicalize Kinds based on strict mapping table
-- 'test' kind -> 'output' (generic catch-all for old rows)
update dev.docs set kind = 'output' where kind = 'test';
-- Specific filenames that MUST be 'output'
update dev.docs set kind = 'output' where title in ('test.py', 'result.md') or title like '%result.md';
-- Specific filenames that MUST be 'test_spec'
update dev.docs set kind = 'test_spec' where title = 'test_spec.md';
-- Specific filenames that MUST be 'task'
update dev.docs set kind = 'task' where title = 'task.md';

-- Fix 3: Delete duplicates (keeping newest)
delete from dev.docs d
using dev.docs d2
where d.source = d2.source
  and d.created_at < d2.created_at;

-- Fix 4: Remove any remaining invalid kinds
delete from dev.docs 
where kind not in ('spec', 'task', 'test_spec', 'code_summary', 'output', 'audit');

-- 5) Constraints
-- Unique index for upsert support
create unique index if not exists dev_docs_source_uq on dev.docs (source);

-- Refinements (Schema Migration for Docs)
alter table dev.docs add column if not exists content_hash text generated always as (md5(content)) stored;

-- Kind check constraint (added as NOT VALID first for safety)
alter table dev.docs drop constraint if exists dev_docs_kind_chk;
alter table dev.docs
  add constraint dev_docs_kind_chk
  check (kind in ('spec', 'task', 'test_spec', 'code_summary', 'output', 'audit'))
  not valid;

-- Validate the constraint
alter table dev.docs validate constraint dev_docs_kind_chk;

-- ==============================================================================
-- 7) Agent Activity / Observability
-- ==============================================================================

create table if not exists dev.agent_activity (
  id uuid primary key default gen_random_uuid(),

  run_id uuid not null,         -- Links events to a single execution (crew/pipeline)
  agent text not null,          -- 'crew', 'qa_guardian', 'context_sync', 'test'
  action text not null,         -- See Dictionary (pipeline_start, sync_docs_*, etc.)
  status text default 'ok',     -- 'ok', 'warn', 'error'
  model text,                   -- 'gemini-1.5-flash', 'claude', etc.

  input jsonb,
  output jsonb,

  tokens int,
  ms int,
  error text,
  meta jsonb default '{}'::jsonb,

  created_at timestamptz default now()
);

-- Refinements (Apply to existing table if created previously)
-- 1. Ensure columns exist
alter table dev.agent_activity add column if not exists run_id uuid;
alter table dev.agent_activity add column if not exists status text default 'ok';
alter table dev.agent_activity add column if not exists model text;

-- 2. Clean up incompatible rows (orphaned logs without run_id)
delete from dev.agent_activity where run_id is null;

-- 3. Enforce Not Null
alter table dev.agent_activity alter column run_id set not null;

-- 4. Ensure other columns exist
alter table dev.agent_activity add column if not exists agent text;
alter table dev.agent_activity add column if not exists action text;
alter table dev.agent_activity add column if not exists meta jsonb default '{}'::jsonb;
alter table dev.agent_activity add column if not exists error text;
alter table dev.agent_activity add column if not exists tokens int;
alter table dev.agent_activity add column if not exists ms int;

alter table dev.agent_activity drop constraint if exists agent_activity_status_chk;
alter table dev.agent_activity 
  add constraint agent_activity_status_chk 
  check (status in ('ok', 'warn', 'error'));

-- Indexes for Activity (Composite for timeline view)
drop index if exists dev_agent_activity_run_idx; -- Drop simple index if exists
create index if not exists dev_agent_activity_run_created_idx on dev.agent_activity(run_id, created_at desc);
create index if not exists dev_agent_activity_action_idx on dev.agent_activity(action);


-- ==============================================================================
-- 8) Audit Logs (Structured QA Signals)
-- ==============================================================================

create table if not exists dev.audit_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid,
  doc_id uuid references dev.docs(id) on delete set null,

  type text not null,        -- 'state_ssot', 'layers', 'render', 'tests_gap'
  severity text not null,    -- 'info', 'warning', 'error'
  message text not null,
  details jsonb default '{}'::jsonb,

  created_at timestamptz default now()
);

-- Refinements (Constraints)
-- 1. Ensure columns exist (Bulletproof migration)
alter table dev.audit_logs add column if not exists run_id uuid;
alter table dev.audit_logs add column if not exists doc_id uuid;
alter table dev.audit_logs add column if not exists details jsonb default '{}'::jsonb;
alter table dev.audit_logs add column if not exists type text;
alter table dev.audit_logs add column if not exists severity text;
alter table dev.audit_logs add column if not exists message text;

-- 2. Clean up invalid rows (nulls)
delete from dev.audit_logs where type is null or severity is null or message is null;

-- 3. Enforce Not Null
alter table dev.audit_logs alter column type set not null;
alter table dev.audit_logs alter column severity set not null;
alter table dev.audit_logs alter column message set not null;

alter table dev.audit_logs drop constraint if exists audit_logs_severity_chk;
alter table dev.audit_logs 
  add constraint audit_logs_severity_chk 
  check (severity in ('info', 'warning', 'error'));

alter table dev.audit_logs drop constraint if exists audit_logs_type_chk;
alter table dev.audit_logs 
  add constraint audit_logs_type_chk 
  check (type in ('state_ssot', 'layers', 'render', 'tests_gap'));

-- Indexes for Audit
create index if not exists dev_audit_logs_run_idx on dev.audit_logs(run_id);
create index if not exists dev_audit_logs_sev_created_idx on dev.audit_logs(severity, created_at desc);



-- 5) Trigger for updated_at
drop trigger if exists trg_dev_docs_updated_at on dev.docs;
create trigger trg_dev_docs_updated_at
before update on dev.docs
for each row execute function dev.set_updated_at();

-- 6) Indexes
create index if not exists dev_docs_kind_idx on dev.docs (kind);
create index if not exists dev_docs_updated_idx on dev.docs (updated_at desc);
