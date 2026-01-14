-- ============================================================
-- SymbolField OS — DB Core v0.5 (Graph + Spaces + RAG + ACL)
-- Terminology: node + link + space (fractal nesting via parent_space_id)
-- Depth target: ~5 (enforced in ACL inheritance helper)
-- Scale target: ~10k nodes/links per user (indexes included)
-- ============================================================

-- ---------- 0) Extensions ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------- 1) Types ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_role') THEN
    CREATE TYPE public.space_role AS ENUM ('owner','editor','commenter','viewer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_visibility') THEN
    CREATE TYPE public.space_visibility AS ENUM ('private','shared','public');
  END IF;
END $$;

-- ---------- 2) Core tables: spaces + membership ----------
CREATE TABLE IF NOT EXISTS public.spaces (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- fractal nesting
  parent_space_id  uuid NULL REFERENCES public.spaces(id) ON DELETE SET NULL,
  inherit_membership boolean NOT NULL DEFAULT true,   -- if true, parent membership applies (up to depth 5)

  -- how visible the space is without explicit membership
  visibility       public.space_visibility NOT NULL DEFAULT 'private',

  -- optional "portal card" node that represents this space inside its parent space
  -- (can be NULL during creation; app can set later)
  entry_node_id    uuid NULL,

  title            text NOT NULL,
  description      text NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT spaces_metadata_is_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_spaces_parent ON public.spaces(parent_space_id);
CREATE INDEX IF NOT EXISTS idx_spaces_owner  ON public.spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_spaces_visibility ON public.spaces(visibility);

CREATE TABLE IF NOT EXISTS public.space_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id   uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.space_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT space_members_unique UNIQUE (space_id, user_id),
  CONSTRAINT space_members_metadata_is_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_space_members_space ON public.space_members(space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user  ON public.space_members(user_id);

-- Defer entry_node_id FK until nodes table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'spaces_entry_node_fk'
  ) THEN
    ALTER TABLE public.spaces
      ADD CONSTRAINT spaces_entry_node_fk
      FOREIGN KEY (entry_node_id) REFERENCES public.nodes(id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- nodes not created yet; will be added after nodes table creation below
    NULL;
END $$;

-- ---------- 3) Graph tables: nodes + links ----------
-- Migration helpers: rename edges -> links (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='edges')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='links') THEN
    ALTER TABLE public.edges RENAME TO links;
  END IF;
END $$;

-- Migration helpers: retire confusing "relations" table (optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='relations')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='relations_legacy') THEN
    ALTER TABLE public.relations RENAME TO relations_legacy;
  END IF;
END $$;

-- Nodes: no hard typing. "components" drives UI composition; "tags" drives semantics/search.
CREATE TABLE IF NOT EXISTS public.nodes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id   uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,

  label      text NOT NULL DEFAULT '',
  components text[] NOT NULL DEFAULT '{}'::text[],
  tags       text[] NOT NULL DEFAULT '{}'::text[],

  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  deleted_at timestamptz NULL,

  CONSTRAINT nodes_metadata_is_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_nodes_space ON public.nodes(space_id);
CREATE INDEX IF NOT EXISTS idx_nodes_created_by ON public.nodes(created_by);
CREATE INDEX IF NOT EXISTS idx_nodes_tags_gin ON public.nodes USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_nodes_components_gin ON public.nodes USING gin (components);

-- Re-attach spaces.entry_node_id FK if it failed earlier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spaces_entry_node_fk') THEN
    ALTER TABLE public.spaces
      ADD CONSTRAINT spaces_entry_node_fk
      FOREIGN KEY (entry_node_id) REFERENCES public.nodes(id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- Links: "kind" is the *only* explicit semantic classifier.
-- Examples:
--   kind='link'   (default)
--   kind='portal' (switch to another space)
-- Everything else goes to tags/metadata.
CREATE TABLE IF NOT EXISTS public.links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- belongs to the same space as from_node (enforced by trigger)
  space_id      uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,

  from_node_id  uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  to_node_id    uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,

  kind          text NOT NULL DEFAULT 'link',
  weight        float8 NOT NULL DEFAULT 1.0,

  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  deleted_at    timestamptz NULL,

  CONSTRAINT links_metadata_is_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_links_space ON public.links(space_id);
CREATE INDEX IF NOT EXISTS idx_links_from  ON public.links(from_node_id);
CREATE INDEX IF NOT EXISTS idx_links_to    ON public.links(to_node_id);
CREATE INDEX IF NOT EXISTS idx_links_kind  ON public.links(kind);

-- If old links table came from edges, normalize columns
DO $$
BEGIN
  -- edge_type -> kind (best-effort)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='edge_type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='kind') THEN
    ALTER TABLE public.links ADD COLUMN kind text NOT NULL DEFAULT 'link';
    EXECUTE 'UPDATE public.links SET kind = COALESCE(edge_type, ''link'')';
    ALTER TABLE public.links DROP COLUMN edge_type;
  END IF;

  -- ensure expected columns exist if legacy schema missing them
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='kind') THEN
    ALTER TABLE public.links ADD COLUMN kind text NOT NULL DEFAULT 'link';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='created_by') THEN
    ALTER TABLE public.links ADD COLUMN created_by uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='created_at') THEN
    ALTER TABLE public.links ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- ---------- 4) RAG: documents + chunks ----------
-- If you had separate tables (knowledge_items/style_refs/agent_mem), this unifies them.
-- doc_type distinguishes use-cases; space_id anchors permissions and "where it lives" in the fractal continuum.

CREATE TABLE IF NOT EXISTS public.rag_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id   uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,

  -- optional: bind doc to a node (e.g. note node)
  node_id    uuid NULL REFERENCES public.nodes(id) ON DELETE SET NULL,

  doc_type   text NOT NULL,          -- 'knowledge' | 'style_ref' | 'agent_mem' | 'manual' | ...
  title      text NOT NULL DEFAULT '',
  content    text NOT NULL DEFAULT '',

  source     text NULL,
  url        text NULL,
  tags       text[] NOT NULL DEFAULT '{}'::text[],
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  deleted_at timestamptz NULL,

  CONSTRAINT rag_documents_metadata_is_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_rag_docs_space ON public.rag_documents(space_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_node  ON public.rag_documents(node_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_type  ON public.rag_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_rag_docs_tags_gin ON public.rag_documents USING gin (tags);

CREATE TABLE IF NOT EXISTS public.rag_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      uuid NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  chunk_index int4 NOT NULL DEFAULT 0,

  content     text NOT NULL,
  embedding   vector(1536),

  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rag_chunks_unique UNIQUE (doc_id, chunk_index),
  CONSTRAINT rag_chunks_metadata_is_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc ON public.rag_chunks(doc_id);

-- Vector index (cosine). Tune lists based on data size; for small datasets, brute-force is fine.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_rag_chunks_embedding'
  ) THEN
    EXECUTE 'CREATE INDEX idx_rag_chunks_embedding ON public.rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
  END IF;
EXCEPTION
  WHEN others THEN
    -- ivfflat requires enough rows to be worth it; ignore if it errors in early stage
    NULL;
END $$;

-- ---------- 5) Optional: STATE model (not categorically bound to space) ----------
CREATE TABLE IF NOT EXISTS public.states (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  timestamp     timestamptz NOT NULL DEFAULT now(),
  mode          text NULL,
  tone          text NULL,
  glyph_id      uuid NULL, -- keep loose; can FK to glyphs if you want
  note          text NULL,
  session_type  text NULL,

  -- Optional: context only (NULL allowed)
  space_id      uuid NULL REFERENCES public.spaces(id) ON DELETE SET NULL,

  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT states_metadata_is_object CHECK (jsonb_typeof(metadata)='object')
);

CREATE INDEX IF NOT EXISTS idx_states_user_time ON public.states(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_states_space_time ON public.states(space_id, timestamp DESC);

-- ---------- 6) Timestamps triggers ----------
CREATE OR REPLACE FUNCTION public.sf_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spaces_touch ON public.spaces;
CREATE TRIGGER trg_spaces_touch
BEFORE UPDATE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION public.sf_touch_updated_at();

DROP TRIGGER IF EXISTS trg_nodes_touch ON public.nodes;
CREATE TRIGGER trg_nodes_touch
BEFORE UPDATE ON public.nodes
FOR EACH ROW EXECUTE FUNCTION public.sf_touch_updated_at();

DROP TRIGGER IF EXISTS trg_rag_docs_touch ON public.rag_documents;
CREATE TRIGGER trg_rag_docs_touch
BEFORE UPDATE ON public.rag_documents
FOR EACH ROW EXECUTE FUNCTION public.sf_touch_updated_at();

-- ---------- 7) Link hygiene: enforce link.space_id = from_node.space_id ----------
CREATE OR REPLACE FUNCTION public.sf_links_set_space_and_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space uuid;
BEGIN
  SELECT n.space_id INTO v_space
  FROM public.nodes n
  WHERE n.id = NEW.from_node_id;

  IF v_space IS NULL THEN
    RAISE EXCEPTION 'from_node_id not found or has no space_id';
  END IF;

  NEW.space_id := v_space;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_links_space_user ON public.links;
CREATE TRIGGER trg_links_space_user
BEFORE INSERT OR UPDATE ON public.links
FOR EACH ROW EXECUTE FUNCTION public.sf_links_set_space_and_user();

-- ---------- 8) ACL helper functions (depth <= 5) ----------
-- Returns best effective role for current user in given space:
-- 1) owner always wins
-- 2) direct membership in the space
-- 3) inherited membership from ancestors while inherit_membership=true (up to depth 5)
CREATE OR REPLACE FUNCTION public.sf_space_role(p_space_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS public.space_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN s.owner_id = p_user_id THEN 'owner'::public.space_role
      ELSE (
        WITH RECURSIVE chain AS (
          SELECT id, parent_space_id, inherit_membership, 0 AS depth
          FROM public.spaces
          WHERE id = p_space_id

          UNION ALL

          SELECT parent.id, parent.parent_space_id, parent.inherit_membership, c.depth + 1
          FROM chain c
          JOIN public.spaces parent ON parent.id = c.parent_space_id
          WHERE c.inherit_membership = true
            AND c.parent_space_id IS NOT NULL
            AND c.depth < 5
        )
        SELECT sm.role
        FROM chain c
        JOIN public.space_members sm
          ON sm.space_id = c.id AND sm.user_id = p_user_id
        ORDER BY c.depth ASC
        LIMIT 1
      )
    END
  FROM public.spaces s
  WHERE s.id = p_space_id;
$$;

CREATE OR REPLACE FUNCTION public.sf_can_view_space(p_space_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (SELECT (visibility = 'public') FROM public.spaces WHERE id = p_space_id),
      false
    )
    OR (public.sf_space_role(p_space_id, p_user_id) IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.sf_can_comment_space(p_space_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sf_space_role(p_space_id, p_user_id) IN ('owner','editor','commenter');
$$;

CREATE OR REPLACE FUNCTION public.sf_can_edit_space(p_space_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sf_space_role(p_space_id, p_user_id) IN ('owner','editor');
$$;

CREATE OR REPLACE FUNCTION public.sf_can_manage_space(p_space_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sf_space_role(p_space_id, p_user_id) = 'owner';
$$;

-- ---------- 9) RLS ----------
-- Spaces
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

-- Spaces: anyone can view public; otherwise members/owner/inherited
DROP POLICY IF EXISTS spaces_select ON public.spaces;
CREATE POLICY spaces_select
ON public.spaces
FOR SELECT
USING (public.sf_can_view_space(id));

DROP POLICY IF EXISTS spaces_insert ON public.spaces;
CREATE POLICY spaces_insert
ON public.spaces
FOR INSERT
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS spaces_update ON public.spaces;
CREATE POLICY spaces_update
ON public.spaces
FOR UPDATE
USING (public.sf_can_manage_space(id))
WITH CHECK (public.sf_can_manage_space(id));

-- space_members: view if you can view the space; manage if owner
DROP POLICY IF EXISTS space_members_select ON public.space_members;
CREATE POLICY space_members_select
ON public.space_members
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS space_members_insert ON public.space_members;
CREATE POLICY space_members_insert
ON public.space_members
FOR INSERT
WITH CHECK (public.sf_can_manage_space(space_id));

DROP POLICY IF EXISTS space_members_update ON public.space_members;
CREATE POLICY space_members_update
ON public.space_members
FOR UPDATE
USING (public.sf_can_manage_space(space_id))
WITH CHECK (public.sf_can_manage_space(space_id));

DROP POLICY IF EXISTS space_members_delete ON public.space_members;
CREATE POLICY space_members_delete
ON public.space_members
FOR DELETE
USING (public.sf_can_manage_space(space_id));

-- nodes: view/edit based on space permissions; no hard delete in MVP
DROP POLICY IF EXISTS nodes_select ON public.nodes;
CREATE POLICY nodes_select
ON public.nodes
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS nodes_insert ON public.nodes;
CREATE POLICY nodes_insert
ON public.nodes
FOR INSERT
WITH CHECK (public.sf_can_edit_space(space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS nodes_update ON public.nodes;
CREATE POLICY nodes_update
ON public.nodes
FOR UPDATE
USING (public.sf_can_edit_space(space_id))
WITH CHECK (public.sf_can_edit_space(space_id));

DROP POLICY IF EXISTS nodes_delete ON public.nodes;
CREATE POLICY nodes_delete
ON public.nodes
FOR DELETE
USING (false);

-- links: view/edit based on source space; no hard delete in MVP
DROP POLICY IF EXISTS links_select ON public.links;
CREATE POLICY links_select
ON public.links
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS links_insert ON public.links;
CREATE POLICY links_insert
ON public.links
FOR INSERT
WITH CHECK (public.sf_can_edit_space(space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS links_update ON public.links;
CREATE POLICY links_update
ON public.links
FOR UPDATE
USING (public.sf_can_edit_space(space_id))
WITH CHECK (public.sf_can_edit_space(space_id));

DROP POLICY IF EXISTS links_delete ON public.links;
CREATE POLICY links_delete
ON public.links
FOR DELETE
USING (false);

-- rag_documents: view/edit based on space permissions; no hard delete in MVP
DROP POLICY IF EXISTS rag_docs_select ON public.rag_documents;
CREATE POLICY rag_docs_select
ON public.rag_documents
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS rag_docs_insert ON public.rag_documents;
CREATE POLICY rag_docs_insert
ON public.rag_documents
FOR INSERT
WITH CHECK (public.sf_can_edit_space(space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS rag_docs_update ON public.rag_documents;
CREATE POLICY rag_docs_update
ON public.rag_documents
FOR UPDATE
USING (public.sf_can_edit_space(space_id))
WITH CHECK (public.sf_can_edit_space(space_id));

DROP POLICY IF EXISTS rag_docs_delete ON public.rag_documents;
CREATE POLICY rag_docs_delete
ON public.rag_documents
FOR DELETE
USING (false);

-- rag_chunks: guarded through parent document's space
DROP POLICY IF EXISTS rag_chunks_select ON public.rag_chunks;
CREATE POLICY rag_chunks_select
ON public.rag_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = rag_chunks.doc_id
      AND public.sf_can_view_space(d.space_id)
  )
);

DROP POLICY IF EXISTS rag_chunks_insert ON public.rag_chunks;
CREATE POLICY rag_chunks_insert
ON public.rag_chunks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = rag_chunks.doc_id
      AND public.sf_can_edit_space(d.space_id)
  )
);

DROP POLICY IF EXISTS rag_chunks_update ON public.rag_chunks;
CREATE POLICY rag_chunks_update
ON public.rag_chunks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = rag_chunks.doc_id
      AND public.sf_can_edit_space(d.space_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = rag_chunks.doc_id
      AND public.sf_can_edit_space(d.space_id)
  )
);

DROP POLICY IF EXISTS rag_chunks_delete ON public.rag_chunks;
CREATE POLICY rag_chunks_delete
ON public.rag_chunks
FOR DELETE
USING (false);

-- states: private by default (per user). space_id is only context.
DROP POLICY IF EXISTS states_select ON public.states;
CREATE POLICY states_select
ON public.states
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS states_insert ON public.states;
CREATE POLICY states_insert
ON public.states
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS states_update ON public.states;
CREATE POLICY states_update
ON public.states
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS states_delete ON public.states;
CREATE POLICY states_delete
ON public.states
FOR DELETE
USING (false);

-- ---------- 10) Notes for app behavior (non-enforced but canonical) ----------
-- Space boundary:
--   - a node "belongs" to exactly one space via nodes.space_id
--   - cross-space references are via links.kind='portal' (or other kinds) + app behavior
--
-- Portal:
--   - portal link lives in the source space (link.space_id)
--   - target may be inaccessible; UI should show "no access" when SELECT on target space fails
--
-- Metadata discipline:
--   - keep stable, indexed fields as real columns (tags/components/kind/doc_type)
--   - use metadata for rare/experimental keys; promote to columns once it becomes critical
-- ============================================================

-- ============================================================
-- PRD alignment + patches (v0.5) — merged on top of sf_v0_5_final.sql
-- Adds: unlisted visibility, state focus fields, state_scopes, event_log_entries,
-- access funnel tables (waitlist/allowlist/claim codes/entitlements),
-- artifacts compatibility views, events compatibility view, doc-level embedding.
-- ============================================================

-- ---------- A) Enum alignment ----------
DO $$
BEGIN
  -- Add 'unlisted' to space_visibility enum if missing (Supabase/Postgres supports IF NOT EXISTS)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_visibility') THEN
    BEGIN
      EXECUTE $$ALTER TYPE public.space_visibility ADD VALUE IF NOT EXISTS 'unlisted'$$;
    EXCEPTION WHEN duplicate_object THEN
      -- already present
      NULL;
    END;
  END IF;
END $$;

-- ---------- B) States: focus fields (NOW context) ----------
ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS focus_node_id uuid NULL REFERENCES public.nodes(id) ON DELETE SET NULL;

ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS focus_depth int4 NOT NULL DEFAULT 1;

-- ---------- C) State scopes (optional but PRD-backed) ----------
CREATE TABLE IF NOT EXISTS public.state_scopes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id   uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,

  scope_type text NOT NULL CHECK (scope_type IN ('space','node','query','hub')),
  ref_id     uuid NULL,
  weight     float8 NOT NULL DEFAULT 1.0,

  filters    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT state_scopes_filters_is_object CHECK (jsonb_typeof(filters)='object')
);

ALTER TABLE public.state_scopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS state_scopes_select ON public.state_scopes;
CREATE POLICY state_scopes_select ON public.state_scopes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.states s
      WHERE s.id = state_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS state_scopes_insert ON public.state_scopes;
CREATE POLICY state_scopes_insert ON public.state_scopes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.states s
      WHERE s.id = state_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS state_scopes_delete ON public.state_scopes;
CREATE POLICY state_scopes_delete ON public.state_scopes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.states s
      WHERE s.id = state_id AND s.user_id = auth.uid()
    )
  );

-- ---------- D) EventLogEntry (canonical) ----------
CREATE TABLE IF NOT EXISTS public.event_log_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts          timestamptz NOT NULL DEFAULT now(),

  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id    uuid NULL REFERENCES public.spaces(id) ON DELETE SET NULL,

  -- snapshot address for deep links / audit (optional)
  address     jsonb NULL,

  action_type text NOT NULL,
  entity_kind text NULL, -- 'space'|'node'|'link'|'state'|'artifact'|...
  entity_id   uuid NULL,

  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  undo        jsonb NULL,
  meta        jsonb NULL,

  CONSTRAINT event_log_payload_is_object CHECK (jsonb_typeof(payload)='object'),
  CONSTRAINT event_log_address_is_object CHECK (address IS NULL OR jsonb_typeof(address)='object')
);

CREATE INDEX IF NOT EXISTS event_log_entries_ts_idx        ON public.event_log_entries (ts DESC);
CREATE INDEX IF NOT EXISTS event_log_entries_user_ts_idx   ON public.event_log_entries (user_id, ts DESC);
CREATE INDEX IF NOT EXISTS event_log_entries_space_ts_idx  ON public.event_log_entries (space_id, ts DESC);
CREATE INDEX IF NOT EXISTS event_log_entries_action_idx    ON public.event_log_entries (action_type);
CREATE INDEX IF NOT EXISTS event_log_entries_entity_idx    ON public.event_log_entries (entity_id);

ALTER TABLE public.event_log_entries ENABLE ROW LEVEL SECURITY;

-- Read: you can read your own events; also space events if you can view the space.
DROP POLICY IF EXISTS event_log_select ON public.event_log_entries;
CREATE POLICY event_log_select ON public.event_log_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (space_id IS NOT NULL AND public.sf_can_view_space(space_id, auth.uid()))
  );

-- Write: you can write events for spaces you can edit; user_id must match.
DROP POLICY IF EXISTS event_log_insert ON public.event_log_entries;
CREATE POLICY event_log_insert ON public.event_log_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      space_id IS NULL
      OR public.sf_can_edit_space(space_id, auth.uid())
    )
  );

-- Optional: allow delete only for own events (usually you'd keep append-only)
DROP POLICY IF EXISTS event_log_delete ON public.event_log_entries;
CREATE POLICY event_log_delete ON public.event_log_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- E) Access funnel + entitlements ----------
CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  source     text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT waitlist_email_unique UNIQUE (email),
  CONSTRAINT waitlist_metadata_is_object CHECK (jsonb_typeof(metadata)='object')
);

CREATE TABLE IF NOT EXISTS public.access_allowlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  tier       text NULL,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT allowlist_email_unique UNIQUE (email),
  CONSTRAINT allowlist_metadata_is_object CHECK (jsonb_typeof(metadata)='object')
);

CREATE TABLE IF NOT EXISTS public.claim_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  tier        text NOT NULL,
  max_uses    int NOT NULL DEFAULT 1,
  uses        int NOT NULL DEFAULT 0,
  expires_at  timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT claim_code_unique UNIQUE (code),
  CONSTRAINT claim_uses_check CHECK (uses >= 0 AND uses <= max_uses),
  CONSTRAINT claim_metadata_is_object CHECK (jsonb_typeof(metadata)='object')
);

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        text NOT NULL,
  value      jsonb NOT NULL,
  source     text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT user_entitlement_unique UNIQUE (user_id, key),
  CONSTRAINT entitlement_value_is_object CHECK (jsonb_typeof(value) IN ('object','array','string','number','boolean','null')),
  CONSTRAINT ent_metadata_is_object CHECK (jsonb_typeof(metadata)='object')
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist_signups(created_at);
CREATE INDEX IF NOT EXISTS idx_allowlist_email     ON public.access_allowlist(email);
CREATE INDEX IF NOT EXISTS idx_claim_codes_code    ON public.claim_codes(code);
CREATE INDEX IF NOT EXISTS idx_entitlements_user   ON public.user_entitlements(user_id);

ALTER TABLE public.waitlist_signups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_allowlist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements  ENABLE ROW LEVEL SECURITY;

-- waitlist: allow insert for anyone; block select by default (no select policy)
DROP POLICY IF EXISTS waitlist_insert ON public.waitlist_signups;
CREATE POLICY waitlist_insert ON public.waitlist_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- entitlements: user can read own
DROP POLICY IF EXISTS entitlements_select ON public.user_entitlements;
CREATE POLICY entitlements_select ON public.user_entitlements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- (allowlist/claim_codes): no public policies; manage via service role / admin tooling.

-- ---------- F) RAG docs: add document-level embedding (PRD compatibility) ----------
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ---------- G) Compatibility views: artifacts + artifact_chunks + events ----------
-- artifacts: PRD-friendly alias over rag_documents
CREATE OR REPLACE VIEW public.artifacts AS
SELECT
  d.id,
  d.created_by AS user_id,
  d.space_id,
  d.doc_type AS kind,
  NULLIF(d.title,'') AS title,
  NULLIF(d.content,'') AS content,
  d.source,
  d.url,
  d.tags,
  d.embedding,
  d.metadata,
  d.created_at
FROM public.rag_documents d
WHERE d.deleted_at IS NULL;

-- artifact_chunks: alias over rag_chunks
CREATE OR REPLACE VIEW public.artifact_chunks AS
SELECT
  c.id,
  c.doc_id AS artifact_id,
  c.chunk_index,
  c.content,
  c.embedding,
  c.metadata,
  c.created_at
FROM public.rag_chunks c;

-- events: minimal alias over event_log_entries (PRD naming)
CREATE OR REPLACE VIEW public.events AS
SELECT
  e.id,
  e.user_id,
  e.space_id,
  e.action_type AS event_type,
  e.ts AS created_at,
  CASE WHEN e.entity_kind = 'node'  THEN e.entity_id ELSE NULL END AS node_id,
  CASE WHEN e.entity_kind = 'link'  THEN e.entity_id ELSE NULL END AS link_id,
  CASE WHEN e.entity_kind = 'state' THEN e.entity_id ELSE NULL END AS state_id,
  e.payload
FROM public.event_log_entries e;

-- ---------- 11) Patch: Ritual XP loop ----------
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
SECURITY DEFINER
SET search_path = public
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

-- ---------- 12) Patch: Share Subgraph ----------
-- sf_v0.5_patch_share_subgraph_r1.sql
-- Adds minimal ShareLink table for unlisted read-only sharing.
-- IMPORTANT: token verification + subgraph fetch is done in an Edge Function (service role).
-- DB RLS can remain owner-only.

CREATE TABLE IF NOT EXISTS public.share_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- never store raw token; store hash (e.g., sha256 hex/base64)
  token_hash    text NOT NULL UNIQUE,

  -- GraphAddress JSON: {kind, spaceId, nodeId?, view?, path?, camera?, hint?}
  target_address jsonb NOT NULL,

  permission    text NOT NULL DEFAULT 'read',
  is_enabled    boolean NOT NULL DEFAULT true,
  expires_at    timestamptz NULL,

  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_share_links_created_by ON public.share_links(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_links_enabled ON public.share_links(is_enabled) WHERE is_enabled = true;

-- Optional access log (analytics)
CREATE TABLE IF NOT EXISTS public.share_link_access_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id uuid NOT NULL REFERENCES public.share_links(id) ON DELETE CASCADE,
  accessed_at   timestamptz NOT NULL DEFAULT now(),
  ip_hash       text NULL,
  user_agent    text NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_share_access_link_time ON public.share_link_access_log(share_link_id, accessed_at DESC);

-- ============================================================
-- v0.5 r2 add-on: Ritual XP + Share Subgraph + RLS policies
-- ============================================================

-- ---------- RLS enable (new tables) ----------
ALTER TABLE public.ritual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_xp_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_link_access_log ENABLE ROW LEVEL SECURITY;

-- ---------- RLS policies (v0.5 baseline) ----------
-- Spaces
DROP POLICY IF EXISTS spaces_select ON public.spaces;
CREATE POLICY spaces_select
ON public.spaces
FOR SELECT
USING (public.sf_can_view_space(id));

DROP POLICY IF EXISTS spaces_insert ON public.spaces;
CREATE POLICY spaces_insert
ON public.spaces
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND (parent_space_id IS NULL OR public.sf_can_edit_space(parent_space_id))
);

DROP POLICY IF EXISTS spaces_update ON public.spaces;
CREATE POLICY spaces_update
ON public.spaces
FOR UPDATE
USING (public.sf_can_manage_space(id))
WITH CHECK (public.sf_can_manage_space(id));

-- No hard delete in MVP
DROP POLICY IF EXISTS spaces_delete ON public.spaces;
CREATE POLICY spaces_delete
ON public.spaces
FOR DELETE
USING (false);

-- Space members (owner manages)
DROP POLICY IF EXISTS space_members_select ON public.space_members;
CREATE POLICY space_members_select
ON public.space_members
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS space_members_insert ON public.space_members;
CREATE POLICY space_members_insert
ON public.space_members
FOR INSERT
WITH CHECK (public.sf_can_manage_space(space_id));

DROP POLICY IF EXISTS space_members_update ON public.space_members;
CREATE POLICY space_members_update
ON public.space_members
FOR UPDATE
USING (public.sf_can_manage_space(space_id))
WITH CHECK (public.sf_can_manage_space(space_id));

DROP POLICY IF EXISTS space_members_delete ON public.space_members;
CREATE POLICY space_members_delete
ON public.space_members
FOR DELETE
USING (public.sf_can_manage_space(space_id));

-- Nodes (soft delete)
DROP POLICY IF EXISTS nodes_select ON public.nodes;
CREATE POLICY nodes_select
ON public.nodes
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS nodes_insert ON public.nodes;
CREATE POLICY nodes_insert
ON public.nodes
FOR INSERT
WITH CHECK (public.sf_can_edit_space(space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS nodes_update ON public.nodes;
CREATE POLICY nodes_update
ON public.nodes
FOR UPDATE
USING (public.sf_can_edit_space(space_id))
WITH CHECK (public.sf_can_edit_space(space_id));

DROP POLICY IF EXISTS nodes_delete ON public.nodes;
CREATE POLICY nodes_delete
ON public.nodes
FOR DELETE
USING (false);

-- Links (soft delete)
DROP POLICY IF EXISTS links_select ON public.links;
CREATE POLICY links_select
ON public.links
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS links_insert ON public.links;
CREATE POLICY links_insert
ON public.links
FOR INSERT
WITH CHECK (public.sf_can_edit_space(space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS links_update ON public.links;
CREATE POLICY links_update
ON public.links
FOR UPDATE
USING (public.sf_can_edit_space(space_id))
WITH CHECK (public.sf_can_edit_space(space_id));

DROP POLICY IF EXISTS links_delete ON public.links;
CREATE POLICY links_delete
ON public.links
FOR DELETE
USING (false);

-- RAG documents (space-scoped)
DROP POLICY IF EXISTS rag_docs_select ON public.rag_documents;
CREATE POLICY rag_docs_select
ON public.rag_documents
FOR SELECT
USING (public.sf_can_view_space(space_id));

DROP POLICY IF EXISTS rag_docs_insert ON public.rag_documents;
CREATE POLICY rag_docs_insert
ON public.rag_documents
FOR INSERT
WITH CHECK (public.sf_can_edit_space(space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS rag_docs_update ON public.rag_documents;
CREATE POLICY rag_docs_update
ON public.rag_documents
FOR UPDATE
USING (public.sf_can_edit_space(space_id))
WITH CHECK (public.sf_can_edit_space(space_id));

DROP POLICY IF EXISTS rag_docs_delete ON public.rag_documents;
CREATE POLICY rag_docs_delete
ON public.rag_documents
FOR DELETE
USING (false);

-- RAG chunks (scoped through doc)
DROP POLICY IF EXISTS rag_chunks_select ON public.rag_chunks;
CREATE POLICY rag_chunks_select
ON public.rag_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = doc_id
      AND public.sf_can_view_space(d.space_id)
  )
);

DROP POLICY IF EXISTS rag_chunks_insert ON public.rag_chunks;
CREATE POLICY rag_chunks_insert
ON public.rag_chunks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = doc_id
      AND public.sf_can_edit_space(d.space_id)
  )
);

DROP POLICY IF EXISTS rag_chunks_update ON public.rag_chunks;
CREATE POLICY rag_chunks_update
ON public.rag_chunks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = doc_id
      AND public.sf_can_edit_space(d.space_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rag_documents d
    WHERE d.id = doc_id
      AND public.sf_can_edit_space(d.space_id)
  )
);

DROP POLICY IF EXISTS rag_chunks_delete ON public.rag_chunks;
CREATE POLICY rag_chunks_delete
ON public.rag_chunks
FOR DELETE
USING (false);

-- States (user-owned; optional space context)
DROP POLICY IF EXISTS states_select ON public.states;
CREATE POLICY states_select
ON public.states
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS states_insert ON public.states;
CREATE POLICY states_insert
ON public.states
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (space_id IS NULL OR public.sf_can_view_space(space_id))
);

DROP POLICY IF EXISTS states_update ON public.states;
CREATE POLICY states_update
ON public.states
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS states_delete ON public.states;
CREATE POLICY states_delete
ON public.states
FOR DELETE
USING (user_id = auth.uid());

-- State scopes (owned through state)
DROP POLICY IF EXISTS state_scopes_select ON public.state_scopes;
CREATE POLICY state_scopes_select
ON public.state_scopes
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.states s WHERE s.id = state_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS state_scopes_insert ON public.state_scopes;
CREATE POLICY state_scopes_insert
ON public.state_scopes
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.states s WHERE s.id = state_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS state_scopes_update ON public.state_scopes;
CREATE POLICY state_scopes_update
ON public.state_scopes
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.states s WHERE s.id = state_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.states s WHERE s.id = state_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS state_scopes_delete ON public.state_scopes;
CREATE POLICY state_scopes_delete
ON public.state_scopes
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.states s WHERE s.id = state_id AND s.user_id = auth.uid()));

-- Event log (user-owned; append-only)
DROP POLICY IF EXISTS event_log_select ON public.event_log_entries;
CREATE POLICY event_log_select
ON public.event_log_entries
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS event_log_insert ON public.event_log_entries;
CREATE POLICY event_log_insert
ON public.event_log_entries
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS event_log_update ON public.event_log_entries;
CREATE POLICY event_log_update
ON public.event_log_entries
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS event_log_delete ON public.event_log_entries;
CREATE POLICY event_log_delete
ON public.event_log_entries
FOR DELETE
USING (false);

-- Waitlist (public insert only; no reads)
DROP POLICY IF EXISTS waitlist_insert ON public.waitlist_signups;
CREATE POLICY waitlist_insert
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS waitlist_select ON public.waitlist_signups;
CREATE POLICY waitlist_select
ON public.waitlist_signups
FOR SELECT
USING (false);

DROP POLICY IF EXISTS waitlist_update ON public.waitlist_signups;
CREATE POLICY waitlist_update
ON public.waitlist_signups
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS waitlist_delete ON public.waitlist_signups;
CREATE POLICY waitlist_delete
ON public.waitlist_signups
FOR DELETE
USING (false);

-- Allowlist / claim codes (service role manages; no direct user access)
DROP POLICY IF EXISTS allowlist_all ON public.access_allowlist;
CREATE POLICY allowlist_all
ON public.access_allowlist
FOR ALL
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS claim_codes_all ON public.claim_codes;
CREATE POLICY claim_codes_all
ON public.claim_codes
FOR ALL
USING (false)
WITH CHECK (false);

-- User entitlements (user can read own; writes via service role)
DROP POLICY IF EXISTS entitlements_select ON public.user_entitlements;
CREATE POLICY entitlements_select
ON public.user_entitlements
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS entitlements_write ON public.user_entitlements;
CREATE POLICY entitlements_write
ON public.user_entitlements
FOR ALL
USING (false)
WITH CHECK (false);

-- Ritual entries (user-owned; append-only in v0.5)
DROP POLICY IF EXISTS ritual_select ON public.ritual_entries;
CREATE POLICY ritual_select
ON public.ritual_entries
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS ritual_insert ON public.ritual_entries;
CREATE POLICY ritual_insert
ON public.ritual_entries
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (space_id IS NULL OR public.sf_can_view_space(space_id))
);

DROP POLICY IF EXISTS ritual_update ON public.ritual_entries;
CREATE POLICY ritual_update
ON public.ritual_entries
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS ritual_delete ON public.ritual_entries;
CREATE POLICY ritual_delete
ON public.ritual_entries
FOR DELETE
USING (false);

-- XP ledger (read-only to user; writes via SECURITY DEFINER trigger / service role)
DROP POLICY IF EXISTS xp_ledger_select ON public.xp_ledger_entries;
CREATE POLICY xp_ledger_select
ON public.xp_ledger_entries
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS xp_ledger_write ON public.xp_ledger_entries;
CREATE POLICY xp_ledger_write
ON public.xp_ledger_entries
FOR ALL
USING (false)
WITH CHECK (false);

-- XP rates (readable; admin-managed)
DROP POLICY IF EXISTS ritual_rates_select ON public.ritual_xp_rates;
CREATE POLICY ritual_rates_select
ON public.ritual_xp_rates
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS ritual_rates_write ON public.ritual_xp_rates;
CREATE POLICY ritual_rates_write
ON public.ritual_xp_rates
FOR ALL
USING (false)
WITH CHECK (false);

-- Share links (owner-only; public access via Edge Function)
DROP POLICY IF EXISTS share_links_select ON public.share_links;
CREATE POLICY share_links_select
ON public.share_links
FOR SELECT
USING (created_by = auth.uid());

DROP POLICY IF EXISTS share_links_insert ON public.share_links;
CREATE POLICY share_links_insert
ON public.share_links
FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS share_links_update ON public.share_links;
CREATE POLICY share_links_update
ON public.share_links
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS share_links_delete ON public.share_links;
CREATE POLICY share_links_delete
ON public.share_links
FOR DELETE
USING (created_by = auth.uid());

-- Share access log (no direct user access; analytics via service role)
DROP POLICY IF EXISTS share_access_all ON public.share_link_access_log;
CREATE POLICY share_access_all
ON public.share_link_access_log
FOR ALL
USING (false)
WITH CHECK (false);
