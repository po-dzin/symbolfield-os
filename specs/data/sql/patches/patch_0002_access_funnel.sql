-- sf_v0.5_patch_access_funnel_r1.sql
-- Adds minimal tables for: waitlist, allowlist, claim codes, user entitlements.
-- Assumes Supabase auth.users exists and RLS is enabled elsewhere.
-- NOTE: You should add RLS policies mirroring your existing pattern (auth.uid()).

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  source     text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.access_allowlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  tier       text NULL, -- e.g., 'beta', 'kickstarter', 'pro'
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT allowlist_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.claim_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  tier        text NOT NULL, -- maps to entitlements bundle
  max_uses    int NOT NULL DEFAULT 1,
  uses        int NOT NULL DEFAULT 0,
  expires_at  timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT claim_code_unique UNIQUE (code),
  CONSTRAINT claim_uses_check CHECK (uses >= 0 AND uses <= max_uses)
);

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        text NOT NULL,
  value      jsonb NOT NULL,
  source     text NULL, -- 'free'|'beta'|'kickstarter'|'stripe'|'admin'
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT user_entitlement_unique UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist_signups(created_at);
CREATE INDEX IF NOT EXISTS idx_allowlist_email ON public.access_allowlist(email);
CREATE INDEX IF NOT EXISTS idx_claim_codes_code ON public.claim_codes(code);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON public.user_entitlements(user_id);
