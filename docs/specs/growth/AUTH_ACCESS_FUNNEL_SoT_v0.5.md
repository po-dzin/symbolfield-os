Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: AUTH_ACCESS_FUNNEL_SoT_v0.5 (pre-EN normalization)

# AUTH_ACCESS_FUNNEL_SoT_v0.5

---


## 0) Canon
- Supabase Auth handles **identity**.
- SF controls **access** through allowlists + entitlements + role claims.

Primary auth UX:
- **Magic link** email login (passwordless).

---

## 1) Funnel layers (v0.5)
### 1.1 Closed beta (allowlist)
- User signs in via magic link
- If not allowlisted → show “Beta access required” screen
- If allowlisted → grant `beta_tester` claim and unlock app

### 1.2 Kickstarter / tester recruitment (pre-launch)
- Separate landing collects email + intent
- Optionally issues invite codes
- Conversions are tracked separately from app auth

### 1.3 Free access (public)
- Magic link login → default free tier
- Limits may apply (spaces count, share features, storage)

### 1.4 Subscription (future-friendly)
- Entitlements table maps user → plan features
- App checks entitlements at runtime for gated actions

---

## 2) Access checks (runtime)
On app start:
1) `auth.user` resolved
2) fetch user access record / claims
3) derive `AccessContext`:
   - `isBeta`
   - `plan` (free/pro)
   - feature flags

On gated action:
- deny with friendly upsell or “request access” CTA

---

## 3) Data requirements (align with SQL patch)
- allowlist table (beta)
- entitlements table (billing)
- optional invite codes

---

## 4) DoD (v0.5)
- Magic link login works
- Closed beta gate works reliably
- Access context is derived once per session and cached
- Feature gating uses entitlements/claims, not hard-coded UI