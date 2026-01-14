Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: HARMONY_ENGINE_SoT_v0.5_r1.md

# HARMONY_ENGINE_SoT_v0.5_r1
**Status:** SoT (Optional Engine)  
**Scope:** SF v0.5 — optional “HarmonyEngine” for generating skins/themes & UI harmony rules  
**Authority:** `UI_UX_BASELINE_METRICS_SoT_v0.5` remains the default UI truth. HarmonyEngine is a **plugin** layer.

---

## 0) What HarmonyEngine is (in v0.5 terms)
HarmonyEngine is **not required** to ship the MVP.
It is a module that can:
- generate a **ThemeProfile** (palette + motion + density)
- map optional **Tone/Mode** into small accent overlays
- validate accessibility (contrast) and enforce “max 3 accents”

Think: “a theme compiler” for presets/skins.

---

## 1) Inputs / Outputs
### 1.1 Inputs
- `BaseTokens` (from baseline SoT): neutrals, typography, spacing, motion
- `SkinConfig` (optional): accentPrimary, accentSecondary, textures on/off
- `StateOverlay` (optional): mode/tone/glyph visibility policy
- `UserPref`: density (compact/normal/cozy), motion (reduce/normal)

### 1.2 Output: ThemeProfile
```json
{
  "theme": "dark|light",
  "density": "compact|normal|cozy",
  "palette": {
    "neutral": {"N0":"#...", "N1":"#...", "N2":"#...", "N3":"#..."},
    "accent":  {"A1":"#...", "A2":"#...", "A3":"#..."},
    "stateOverlay": {"toneOn": true, "modeOn": false}
  },
  "motion": {"pulseEnabled": true, "reduceMotion": false},
  "textures": {"grain": 0.04, "glass": true}
}
```

---

## 2) v0.5 Minimal feature set (ship-safe)
HarmonyEngine v0.5 supports only:
1) **Accent selection** (A1 + optional A2/A3)
2) **Density presets** (compact/normal/cozy)
3) **Contrast validation** (warn & auto-adjust)
4) **State overlay policy** (show/hide Tone/Mode in UI surfaces)

Everything else (phi/π/e harmonic scaling, ultra-modes) becomes **SkinPack post-v0.5**.

---

## 3) Harmony rules (guardrails)
- Max **3 accents** at once.
- Text contrast must pass minimum standard (auto-adjust if not).
- Mode atmosphere (background shifts) is **OFF by default**.
- Tone color is **local** (ring/pills), not global recolor.

---

## 4) Algorithms (simple & deterministic)
### 4.1 Accent derivation
- `A1` = chosen accentPrimary
- `A2` = optional complement/analogue (from a fixed map per A1)
- `A3` = optional warm/cool counterbalance (rare)

No fancy HSL wandering in v0.5: keep it predictable.

### 4.2 Contrast validation
- For each surface token, validate text tokens.
- If fail → adjust text toward neutral high-contrast token.

---

## 5) Integration points in SF UI
- Home Portal: Portal cards can use `A1` as hover/outline.
- Field: selection outline/glow uses `A1`.
- StateCore: ring stroke uses tone overlay if enabled, else `A1`.
- Time Panel: active lens chip uses `A1`.
- Context UI: primary action uses `A1`.

---

## 6) Persistence (optional)
If you want themes to persist per user, store:
- `user_theme_profile` (json)
- `last_preset_id`

This can live in a simple table or user metadata in Supabase.

---

## 7) Legacy harmonic constants (skin plugin, optional)
The older HarmonyEngine spec used φ/π/e to derive spacing and proportions.
That can still exist as a **SkinPack** that compiles into ThemeProfile.

v0.5 baseline remains grid-based (8pt) for dev sanity.

---

## 8) DoD — v0.5
- [ ] ThemeProfile generation is deterministic.
- [ ] Enforces max 3 accents.
- [ ] Validates contrast and auto-adjusts (or warns).
- [ ] Can be applied without changing interaction affordances.
