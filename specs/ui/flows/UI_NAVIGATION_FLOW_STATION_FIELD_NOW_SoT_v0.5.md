Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_NAVIGATION_FLOW_STATION_FIELD_NOW_SoT_v0.5_r1.md

# UI_NAVIGATION_FLOW_STATION_FIELD_NOW_SoT_v0.5_r1
**Status:** SoT  
**Scope:** SF v0.5 — flow between Station / Space Field / NOW

---

## 0) TL;DR
Four states:
1) Station (portal hub)
2) Space Field (runtime canvas)
3) Note (node view)
4) NOW (ritual deep view)

Canon:
- Enter: Station → Field (Space/Hub)
- Note: Station/Field → Note (Node)
- NOW: Station/Field → NOW (Node, explicit)
- ESC: NOW → Field

---

## 1) State machine
```
[Station] --(PortalActivated enter)--> [Space Field]
[Station] --(PortalActivated note)--> [Note]
[Station] --(PortalActivated now)--> [NOW] --(ESC)--> [Space Field]
[Space Field] --(OpenNote)--> [Note]
[Space Field] --(OpenNOW)--> [NOW] --(ESC)--> [Space Field]
[Anywhere] --(Logo / Open Station)--> [Station]
```

---

## 2) Main flows
- Jump to Space: Station hover→highlight→Enter→Field
- Dive to Node: Station/Field→Note (default), NOW via explicit action
- Return: ESC (NOW→Field), Logo (any→Station)

---

## 3) Supporting loops
- Highlight loop: hover/search preview → overlay highlight (no graph mutation)
- Transition loop: ENTER (zoom+dissolve), NOW (iris/overlay), reduced-motion (fade)

---

## 4) Minimal GraphAddress formats (example)
- station://
- space://{spaceId}?view=field
- hub://{spaceId}/{hubNodeId}?view=field
- node://{spaceId}/{nodeId}?view=note
- node://{spaceId}/{nodeId}?view=now

---

## 5) Events/Actions
StationOpened, PortalHovered, PortalActivated, SpaceOpened, NowEntered, NowExited, BackToStation

---

## 6) DoD v0.5
- [ ] ESC from NOW always returns to correct Field.
- [ ] Logo always leads to Station.
- [ ] Transitions and highlights do not break 60fps feel.
