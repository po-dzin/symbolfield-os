Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: SETTINGS_PRESETS_CUSTOMIZATION_SoT_v0.5_r1.md

# SETTINGS_PRESETS_CUSTOMIZATION_SoT_v0.5
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — presets + hide/show customization with guardrails  
**Canon:** Modules ≠ Views. You can hide UI without losing data.

---

## 1) Purpose
Support:
- **Out-of-box** experience (Everyday user)
- ready-made **Presets**
- controlled customization (hide/show)
- Dev Mode (Obsidian-like) behind a flag (post-v0.5 or power users)

---

## 2) Definitions
- **Module** = feature capability (data + logic)
- **View** = UI surface/widget/panel visibility
- **Preset** = bundle of {modules enabled, views visible, hotkeys mapping defaults}

Rule: a module may be enabled while its view is hidden; **data persists**.

---

## 3) Settings IA (3 layers)
1) **Human** (default)
   - Preset switcher
   - Basic toggles (show StateCore micro, show Log chip)
2) **Advanced**
   - Views visibility (drawer toggles)
   - Hotkeys remap (limited)
3) **Dev** (flagged)
   - components registry, schema validators, view builder (post-v0.5)

---

## 4) Presets (v0.5 canonical set)
| Preset | Goal | Visible by default |
|---|---|---|
| Minimal Daily | log quickly, no clutter | StateCore micro + Time Chip + Log Drawer |
| Creator Jam | capture + link | Context UI + Log Drawer + quick capture |
| Architect/Research | navigate graphs | stronger search + filters + library views |
| Ritual/Regulation | rhythm + sessions | StateCore expanded default + log lens |
| Dev (post) | deep customization | Dev sections on |

---

## 5) Guardrails
- Always available: “Reset to Default”
- Core views cannot be all hidden at once (Field + search must remain reachable)
- Dev settings only if `devModeEnabled=true`

---

## 6) DoD — v0.5
- [ ] Presets work and are reversible.
- [ ] Hide/show affects views only (not data).
- [ ] Default preset is clean and minimal.
