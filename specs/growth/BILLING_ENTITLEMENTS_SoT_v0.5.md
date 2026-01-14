Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: BILLING_ENTITLEMENTS_SoT_v0.5_r1.md

# BILLING_ENTITLEMENTS_SoT_v0.5
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — free tier + subscriptions + Kickstarter tester claims  
**Canon:** Billing provider can be external (Stripe/Kickstarter). SF stores **entitlements** as the source of truth for features.

---

## 1) Goal
Enable:
- **Free access** baseline
- **Subscription plans** (monthly/yearly)
- **Kickstarter testers** via claim codes (time-limited or lifetime)
- a single feature-check API: `hasEntitlement(userId, key)` / `limits(userId)`

---

## 2) Plan model (v0.5 minimal)
### 2.1 Plans
- `free`
- `beta_tester` (Kickstarter claim or invite tier)
- `pro`
- `studio` (optional post-v0.5)

### 2.2 Entitlement keys (examples)
- `spaces.max` (int)
- `share.enabled` (bool)
- `share.readonly_links.max` (int)
- `collab.max_members_per_space` (int)
- `rag.enabled` (bool) (optional)
- `devmode.enabled` (bool) (flag gate)

> v0.5 rule: **plans map to entitlements**; UI reads entitlements, not plan names.

---

## 3) Kickstarter testers
### 3.1 Redemption
- User receives a **claim code** from Kickstarter flow (manual for v0.5).
- Redeem code → grant `beta_tester` entitlements (or lifetime pro).

### 3.2 Tracking
Store:
- `source = "kickstarter"`
- pledge tier label / campaign id (optional metadata)

---

## 4) Subscription integration (v0.5 pragmatic)
Two viable implementations:

A) **Stripe-first** (recommended post-v0.5)
- Stripe Customer + Subscription tables
- Webhook → update `user_entitlements`

B) **Entitlement-first** (v0.5)
- Manually grant entitlements (admin)
- UI + code paths already support real billing later

v0.5 should support B now, and keep schema ready for A.

---

## 5) Events (persist)
- `SubscriptionActivated(plan)`
- `SubscriptionRenewed`
- `SubscriptionCancelled`
- `EntitlementGranted(key,value,source)`
- `EntitlementRevoked(key,source)`

---

## 6) DoD — v0.5
- [ ] Feature gates read from `user_entitlements`.
- [ ] Claim codes grant entitlements.
- [ ] Free tier limits enforced (at least `spaces.max`).
- [ ] All entitlement changes recorded in EventLogEntry.
