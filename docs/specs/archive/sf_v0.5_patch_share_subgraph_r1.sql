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
