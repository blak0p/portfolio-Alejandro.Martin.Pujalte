# Tasks: es-localization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 340–420 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: JSON Data Files

- [ ] 1.1 Translate `public/data/identity.json` — rewrite `bio` to natural Spanish
- [ ] 1.2 Translate `public/data/ambitions.json` — all 9 goal `text` values
- [ ] 1.3 Translate `public/data/logs.json` — all 8 log `message` values (keep identifiers like INIT, DEPLOYED in English)

## Phase 2: Layout and Pages

- [x] 2.1 Translate `src/layouts/BaseLayout.astro` — `lang="es"`, nav links, meta defaults, aria-labels
- [x] 2.2 Translate `src/pages/index.astro` — tab labels, section headers, curated label
- [x] 2.3 Translate `src/pages/admin.astro` — `lang="es"`, title suffix

## Phase 3: Identity and Tech Components

- [ ] 3.1 Translate `src/components/identity/IdentitySection.tsx` — NO_SIGNAL, CV download, subtitle, LINKEDIN
- [ ] 3.2 Translate `src/components/techstack/TechMatrix.tsx` — empty state, labels

## Phase 4: Deployments Components

- [ ] 4.1 Translate `src/components/deployments/ProjectCard.tsx` — NO_PREVIEW, CLASSIFIED, Private·NDA, PINNED
- [ ] 4.2 Translate `src/components/deployments/ProjectGrid.tsx` — NO_PROJECTS, EXPAND_MODULES, ALL_PROJECTS
- [ ] 4.3 Translate `src/components/deployments/AllProjectsModal.tsx` — title, deployed count
- [ ] 4.4 Translate `src/components/deployments/ProjectModal.tsx` — tab names, section labels, NDA block, error states, breadcrumbs

## Phase 5: Ambitions and UI Components

- [ ] 5.1 Translate `src/components/ambitions/Roadmap.tsx` — empty states, placeholders, buttons
- [ ] 5.2 Translate `src/components/ui/CoreMasonry.tsx` — section headers, mobile labels, drawer header

## Phase 6: Terminal and Admin (Largest Files)

- [ ] 6.1 Translate `src/components/terminal/CoreConsole.tsx` — boot banner, help, commands, errors, hints, easter eggs (~50-60 strings)
- [ ] 6.2 Translate `src/components/admin/AdminPanel.tsx` — labels, buttons, tooltips, headers, help text, status messages (~30-40 strings)

## Phase 7: Verification

- [ ] 7.1 Grep for untranslated English strings: `grep -rn '"[A-Z][A-Z ]*"' src/ public/data/` — flag stragglers
- [ ] 7.2 Run `astro build` — must succeed with zero errors
- [ ] 7.3 Manual walkthrough — verify every section renders in Spanish with no broken layout
