Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: SHARE_SUBGRAPH_SoT_v0.5_r1.md

# SHARE_SUBGRAPH_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — unlisted read-only sharing of Space/Hub/Node (subgraph)  
**Canon:** Sharing is a **door** (share link) to an address (GraphAddress). Read-only for v0.5.

---

## 0) Goal
Enable:
- create an **unlisted** share link
- target: **Space / Hub / Node**
- open in a **ShareView** (read-only)
- optional expiry / revoke
- no auth required to view (token-based), but access mediated server-side

Non-goal v0.5:
- collaborative editing
- granular per-node permissions
- public directory / indexing

---

## 1) Sharing model
### 1.1 ShareLink
A share link is a record containing:
- `token_hash` (never store raw token)
- `target_address` (GraphAddress JSON)
- `permission = "read"`
- `is_enabled`
- `expires_at` (optional)
- `created_by`

### 1.2 ShareView
A dedicated route:
- loads via token (edge function)
- renders Field/NOW with **read-only** UI
- hides author-only surfaces (editing, settings, dev mode)

---

## 2) Security canon (v0.5)
- DB table `share_links` is **owner-only** under RLS.
- Public access is via **Edge Function** (service role):
  1) verify token → compute hash
  2) fetch share link
  3) load subgraph data (nodes/links within scope)
  4) return to client (or stream)

This avoids exposing share_links through RLS exceptions.

---

## 3) Scope resolution (how much data is shared)
Targets:
- **Space:** all nodes/links in space (read-only)
- **Hub:** hub node + its local subgraph (implementation: by traversal rules)
- **Node:** node + local subgraph (depth-limited)

v0.5 recommendation:
- implement **depth-limited traversal** with defaults:
  - node: depth=1 (node + its direct neighbors)
  - hub: depth=2
  - space: full space (may cap by node count)

---

## 4) UI behavior (ShareView)
- editing disabled
- selection allowed (for inspect)
- context drawer is read-only
- “Open in SF” button (if signed in and permitted)

---

## 5) Events
- `ShareLinkCreated`
- `ShareLinkRevoked`
- `ShareLinkAccessed` (optional; can be analytics-only)

---

## 6) DoD — v0.5
- [ ] Create share link for Space/Hub/Node.
- [ ] Token is generated once; only hash stored.
- [ ] ShareView loads subgraph read-only with deterministic scope.
- [ ] Owner can revoke/expire a link.
