# Specs Index Rules

## Source of Truth (SoT)
- Canonical specs live under `docs/specs/`.
- SoT file naming: `DOMAIN_NAME_SoT_v0.5.md`.
- SQL schema naming: `schema_v0.5.sql`.
- SQL patches naming: `patch_0001_<name>.sql`, `patch_0002_<name>.sql` (strict numeric order).

## Front Matter (SoT only)
Each SoT file must start with:
- `Status: SoT`
- `Version: v0.5`
- `Owner: SF`
- `Last updated: YYYY-MM-DD`
- `Supersedes: <old filename>` (or `none`)

## Archive Policy
- Old (legacy v0.4) or renamed specs live in `docs/specs/archive/`.
- No deletions: superseded files stay archived for history.

## Change Management
- Add new SoT files with canonical names.
- Update `docs/specs/_index/SF_SPEC_INDEX_v0.5.md` after any change.
- Record migrations or renames in `docs/specs/_index/SF_SPEC_CHANGELOG.md`.
