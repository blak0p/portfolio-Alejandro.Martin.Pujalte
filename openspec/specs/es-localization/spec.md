# es-localization Specification

## Purpose

Translate every user-facing string from English to neutral/professional Spanish. One-time language switch — no i18n framework.

## Requirements

### Requirement: Translate JSON data files

The system MUST replace all user-facing string values in `public/data/*.json` with Spanish.

| File | Fields | Tone |
|------|--------|------|
| `identity.json` | `bio` | Backend engineer's natural Spanish |
| `ambitions.json` | All `text` (9 items) | Authentic for Spanish job market |
| `logs.json` | All `message` (8 entries) | System-log tone, keep proper nouns intact |

#### Scenario: Bio reads as natural Spanish

- GIVEN identity data loaded
- WHEN bio is displayed
- THEN it SHALL read as a Spanish-speaking backend engineer wrote it

#### Scenario: Proper names stay English

- GIVEN any JSON file
- WHEN a value contains a project/tool name (e.g., "git-courer", "AXIOM", "GIT-COURER", "GO")
- THEN that name SHALL NOT be translated

### Requirement: Translate UI labels

The system MUST replace all hardcoded English string literals in `src/` with Spanish.

| File | Strings to translate |
|------|---------------------|
| `BaseLayout.astro` | `html lang`, meta title/description defaults, nav links ("Projects", "Tech", "Ambitions"), "ADMIN"/"ADMIN PANEL →", `aria-label` |
| `index.astro` | Page title suffix, tab buttons (`// PROFILE`, `// TERMINAL`), section headers (`// PROJECTS`, `// TECH_STACK_RECENT`, `// ROADMAP`), sub-label |
| `admin.astro` | `html lang`, page title suffix |
| `IdentitySection.tsx` | `NO_SIGNAL`, `↓ DOWNLOAD CV (EN)`, `// CV — Work experience and history`, `LINKEDIN` |
| `ProjectCard.tsx` | `NO_PREVIEW`, `Private · NDA` |
| `ProjectGrid.tsx` | `NO_PROJECTS`, `[+] EXPAND_MODULES (N)`, `ALL_PROJECTS (N) →` |
| `AllProjectsModal.tsx` | `ALL_PROJECTS`, `(N deployed)`, `[ESC]` |
| `ProjectModal.tsx` | All tab names, section headers, empty states, NDA block, `← back`, `FETCHING...` |
| `TechMatrix.tsx` | `NO_TOOLS_REGISTERED`, `● curated` |
| `Roadmap.tsx` | All empty states, placeholder, `ADD`/`CANCEL`/`+ ADD_GOAL` |
| `CoreMasonry.tsx` | Section headers, comments, mobile UI, terminal header |
| `CoreConsole.tsx` | Boot banner, help output, command results/descriptions, errors, Easter eggs — ALL system messages |

#### Scenario: Section headers keep style

- GIVEN any `// SECTION_NAME` header
- WHEN translated
- THEN the `//` prefix, uppercase, and tracking-widest style SHALL be preserved
- AND the text uses the same convention (e.g., `// PERFIL`, `// PROYECTOS`)

#### Scenario: Status identifiers stay English

- GIVEN status badges (ONLINE, BUSY, IN_PROGRESS, COMPLETED, PAUSED, CLASSIFIED, PINNED, STABLE, LEGACY, ARCHIVED)
- WHEN rendered
- THEN they SHALL remain in English

#### Scenario: Terminal output translated with system persona

- GIVEN terminal boot messages, help text, command results, or error strings
- WHEN displayed
- THEN they SHALL be in Spanish with "system" persona tone
- AND identifiers (`CORE_OS`, `GUEST_ROOT`, `ADMIN_CONSOLE`) SHALL stay English

### Requirement: Preserve layout and structure

The system MUST NOT alter layout, CSS, JSX structure, or code identifiers. Only string literal content changes.

#### Scenario: Build succeeds

- GIVEN all translations applied
- WHEN `astro build` runs
- THEN it SHALL succeed with zero errors

### Requirement: Verify completeness

The system SHOULD verify no English user-facing strings remain in translated files.

#### Scenario: No English strings remain

- GIVEN translated files
- WHEN grepped for English phrases
- THEN no user-facing English text SHALL remain
- AND code identifiers, types, CSS SHALL be excluded from the check
