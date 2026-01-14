Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_STATECORE_SoT_v0.5_r1.md

# UI_STATECORE_SoT_v0.5
**Status:** Source of Truth (SoT)  
**Scope:** SF UI v0.5 — Session HUD + Session Control (StateCore)  
**Key idea:** StateCore shows **SessionState** (not node properties).  
**Pulse meaning:** **BreathPulse** (ring animation rhythm), NOT heart-rate.

---

## 1) Purpose
StateCore is a single UI element that:
- provides a *non-intrusive* read of current **SessionState**
- allows quick adjustment of state (mode/tone/(glyph optional))
- can expand into a bar/panel to start/stop a **Focus Session**
- displays **BreathPulse** as a rhythmic ring animation

---

## 2) Placement
**Anchor:** top-right of the Space Field viewport (safe zone), offset 16–20px.  
In NOW view, StateCore remains top-right (same anchor) unless split layout repositions it.

---

## 3) Visibility modes (progressive disclosure)
StateCore has 3 modes controlled by presets and user settings:

| Mode | Name | Space Field | Dive | Default |
|---|---|---:|---:|---|
| 0 | Hidden | ✅ | optional | Focus/Minimal preset |
| 1 | Micro | ✅ | ✅ | Default preset |
| 2 | Expanded | on demand | default in NOW (optional) | Ritual/Power presets |

### 3.1 Micro behavior (non-intrusive)
- Always minimal footprint
- Auto-fade after inactivity (2–4s) into “quieter” micro variant (optional)
- Expands only on click or hotkey

### 3.2 Expanded behavior
StateCore can expand in two forms:
- **StateBar** (top drop-down bar): quick, shallow, does not block field
- **StatePanel** (right drawer/panel): deeper controls (optional in v0.5)

**v0.5 recommendation:** implement StateBar first; StatePanel can be “More…”

---

## 4) Base payload (what it shows) — v0.5 Essential
### 4.1 Micro payload (Space Field default)
- **Mode** icon: `🕳 / 🌀 / 🔆`
- **Tone**: color dot / ring tint
- **Focus active badge**: tiny `⏱` + progress (only if a focus session is running)
- *(Optional)* **Glyph badge** (off by default)

### 4.2 Expanded payload (StateBar / StatePanel)
**Essential blocks**
1) **Set State**
   - Mode selector (3 states)
   - Tone selector (palette or quick list)
   - Glyph (optional toggle + picker)

2) **Focus Session**
   - Start/Stop
   - Duration presets (25/45/90) + custom
   - Label (optional)
   - Shows running time + progress

3) **BreathPulse**
   - Visual ring pulse animation (tempo)
   - Optional tempo presets (Slow/Normal/Fast) if Breath module enabled

**Not essential in v0.5 (Optional layers)**
- XP / Moon / SEM7 / complex cycles
- “Node state” (conflicts with substrate; handled by NodeStyle/Badges separately)

---

## 5) BreathPulse (definition)
BreathPulse is a rhythmic animation of StateCore ring(s):
- It can be purely aesthetic (ambient) OR tied to Focus Session tempo
- It is NOT biometrics

### 5.1 Activation rules
- If FocusSession active → BreathPulse uses Focus tempo (or chosen tempo)
- If no FocusSession:
  - Default: subtle ambient pulse (optional)
  - Focus preset: pulse off

---

## 6) Interaction & hotkeys (v0.5 baseline)
- Click StateCore Micro → open **StateBar**
- Esc → closes StateBar/Panel (and exits NOW if NOW overlay is active and focused)
- Hotkey: `Cmd/Ctrl + .` → toggle Expanded (StateBar)
- Hotkey: `Cmd/Ctrl + Shift + .` → start/stop Focus Session (optional)

*(Final hotkeys can be adjusted in Settings → Hotkeys.)*

---

## 7) Events emitted (Actions & Events model)
StateCore is a UI surface; it emits events.

### 7.1 UIEvents
- `StateCoreOpened(mode="bar"|"panel")`
- `StateCoreClosed`
- `StateCorePinnedChanged(pinned:boolean)`

### 7.2 DomainEvents (commit)
- `SessionModeSet(mode)`
- `SessionToneSet(tone)`
- `SessionGlyphSet(glyph|null)`
- `FocusSessionStarted(duration, label?)`
- `FocusSessionStopped`
- `BreathPulseTempoSet(tempo)` *(optional, if persisted)*

### 7.3 OverlayEvents
- `BreathPulseTick(phase)` *(optional; can be internal animation loop, not evented)*

---

## 8) Settings knobs (v0.5)
- `statecore.visibility = hidden | micro | auto | pinned`
- `statecore.expand_mode = bar | panel`
- `statecore.show_glyph = true|false`
- `statecore.breath_pulse = off | ambient | focus_only`
- `statecore.auto_fade = true|false`

---

## 9) DoD — StateCore v0.5
- [ ] Micro mode exists and is visually minimal
- [ ] Expanded StateBar exists with Set State + Focus Session
- [ ] BreathPulse ring animation exists (ambient or focus-tied)
- [ ] StateCore is session-level (does not write to node properties)
- [ ] Visibility is controllable via presets/settings
- [ ] Emits consistent events (UIEvents + DomainEvents)
