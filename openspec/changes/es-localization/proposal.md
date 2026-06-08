# Proposal: es-localization

## Intent

The portfolio is entirely in English. The user is applying for jobs in Spain and their CV is already in Spanish. Everything — data content, UI labels, terminal strings, meta tags, nav links — must be translated to Spanish so the site communicates in the same language as the rest of their application materials.

## Scope

### In Scope
- Translate all JSON data files under `public/data/` (identity, ambitions, logs)
- Translate all hardcoded UI labels in `src/components/`, `src/layouts/`, `src/pages/`
- Translate `html lang`, meta tags, titles, nav links
- Translate terminal boot messages, command descriptions, error strings, help text
- Translate admin panel labels

### Out of Scope
- Changing layout, structure, or styling
- Adding multi-language toggle or i18n framework (single-language switch only)
- Translating README files, CV document, or external content

## Capabilities

### New Capabilities
- `es-localization`: Full Spanish translation of all user-facing strings — JSON content, UI labels, terminal output, meta tags, and navigation elements.

### Modified Capabilities
- None

## Approach

Systematic find-and-replace across all files. No i18n library — this is a one-time language switch. The approach is purely mechanical: identify every user-facing string, replace it with its Spanish equivalent, and verify the site renders correctly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `public/data/identity.json` | Modified | Translate `bio` field |
| `public/data/ambitions.json` | Modified | Translate all text fields (9 items) |
| `public/data/logs.json` | Modified | Translate all message fields (8 entries) |
| `src/layouts/BaseLayout.astro` | Modified | lang, meta titles, nav links |
| `src/pages/index.astro` | Modified | Section headers, page title |
| `src/pages/admin.astro` | Modified | lang attr, title |
| `src/components/**/*.tsx` (6+ files) | Modified | All hardcoded labels |
| `src/components/ui/CoreMasonry.tsx` | Modified | Section headers |
| `src/components/terminal/CoreConsole.tsx` | Modified | Boot messages, commands, errors |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missed strings in partial sweeps | Medium | Grep for remaining English strings after translation pass |
| Broken JSX/TSX from string replacements | Low | `astro build` will catch syntax errors |
| Accidental translation of code identifiers | Low | Only translate string literals; code review diffs |

## Rollback Plan

Full `git checkout` of all changed files. The change is purely cosmetic — no logic changes — so reverting is trivial.

## Dependencies

- None

## Success Criteria

- [ ] All visible user-facing strings render in Spanish
- [ ] No English strings remain in translated files (verified via grep)
- [ ] `astro build` succeeds with zero errors
- [ ] Site renders correctly in browser with no broken layout
