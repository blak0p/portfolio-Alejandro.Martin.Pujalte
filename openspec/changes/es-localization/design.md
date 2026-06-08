# Design: es-localization

## Technical Approach

Direct find-and-replace of all user-facing string literals across JSON data files, Astro layouts/pages, and React components. No i18n framework — this is a one-time language switch for a Spanish-only market.

## Architecture Decisions

### Decision: Direct replacement vs i18n framework

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Full i18n (react-intl, i18next) | Unnecessary complexity, bundle overhead, single-use | ❌ |
| Direct find-and-replace | Zero runtime cost, fully reversible, scope-bound | ✅ |

**Rationale**: The portfolio has one audience (Spanish recruiters) and one language. Adding an i18n framework would increase bundle size, add indirection, and never be used for multi-language. Direct replacement keeps the change mechanical and `git checkout`-reversible.

### Decision: Status identifiers stay in English

**Choice**: All status/level identifiers (`ONLINE`, `BUSY`, `IN_PROGRESS`, `COMPLETED`, `PAUSED`, `ARCHIVED`, `STABLE`, `LEGACY`, `MILESTONE`, `INFO`, `WARN`) remain in English.

**Rationale**: These are system-status tokens in the terminal aesthetic — translating them would break the visual language and consistency with data that flows from GitHub API (project statuses are set in English). This is intentional diegetic design.

### Decision: Admin panel translated

**Choice**: All admin panel labels and user-facing text translated to Spanish, except data-driven status values and code identifiers.

**Rationale**: Though an internal tool, it's deployed publicly at `/admin`. A Spanish-speaking user should navigate it in Spanish. Form field names, buttons, headers, and help text are translated.

## Data Flow

```
[Source files] ──find/replace──→ [Translated files] ──astro build──→ [Static site]

     No runtime data transformation.
     No layout, style, or logic changes.
     Zero-cost at runtime — compile-time change only.
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `public/data/identity.json` | Modify | Translate `bio` value |
| `public/data/ambitions.json` | Modify | Translate all 9 `text` values |
| `public/data/logs.json` | Modify | Translate all 8 `message` values |
| `src/layouts/BaseLayout.astro` | Modify | `lang="es"`, nav labels (Projects→Proyectos, Tech→Stack, Ambitions→Metas), aria-label, ADMIN, title/description defaults |
| `src/pages/index.astro` | Modify | Tab labels (PROFILE→PERFIL, TERMINAL), section headers (PROJECTS→PROYECTOS, TECH_STACK_RECENT→STACK_RECIENTE, ROADMAP→HOJA_DE_RUTA), curated label |
| `src/pages/admin.astro` | Modify | `lang="es"`, title |
| `src/components/identity/IdentitySection.tsx` | Modify | NO_SIGNAL, DOWNLOAD CV (EN)→DESCARGAR CV, CV subtitle, LINKEDIN |
| `src/components/deployments/ProjectCard.tsx` | Modify | NO_PREVIEW, CLASSIFIED→CLASIFICADO, Private·NDA→Privado·NDA, PINNED→DESTACADO |
| `src/components/deployments/ProjectGrid.tsx` | Modify | NO_PROJECTS→SIN_PROYECTOS, EXPAND_MODULES→EXPANDIR_MODULOS, ALL_PROJECTS→TODOS_LOS_PROYECTOS |
| `src/components/deployments/AllProjectsModal.tsx` | Modify | ALL_PROJECTS→TODOS_LOS_PROYECTOS, `deployed`→`desplegados` |
| `src/components/deployments/ProjectModal.tsx` | Modify | Tab labels, section labels, fallback text, error messages, breadcrumb labels, Private client project notice, NDA text |
| `src/components/techstack/TechMatrix.tsx` | Modify | NO_TOOLS_REGISTERED→SIN_HERRAMIENTAS, label text |
| `src/components/ambitions/Roadmap.tsx` | Modify | NO_ROADMAP_ITEMS→SIN_OBJETIVOS, Add goals from admin→Añadir desde panel, NO_GOALS_REGISTERED→SIN_METAS, input placeholder, buttons |
| `src/components/terminal/CoreConsole.tsx` | Modify | Boot messages, command descriptions, help text, error strings, system status text, hints, neofetch status, `coffee` output, `approve` output, `hire-me` output |
| `src/components/ui/CoreMasonry.tsx` | Modify | Section headers, deprecated header string, mobile menu labels, drawer labels |
| `src/components/admin/AdminPanel.tsx` | Modify | All visible user-facing labels, headers, buttons, tooltips, placeholders, help text, status messages |

## Strings Split by Category

### JSON data (content translation)
- `identity.bio`: Full paragraph → Spanish
- `ambitions[].text`: 9 goal statements → Spanish
- `logs[].message`: 8 log entries → Spanish (keep identifiers like INIT, DEPLOYED, etc. in English)

### UI section headers (keep `//` prefix and uppercase style)
- `// PROJECTS` → `// PROYECTOS`
- `// TECH_STACK_RECENT` → `// STACK_RECIENTE`
- `// ROADMAP` → `// HOJA_DE_RUTA`
- `// PROFILE` → `// PERFIL`
- `// TERMINAL` (stays — already Spanish-friendly)
- `// CV — Work experience and history` → `// CV — Experiencia y trayectoria`

### Meta / document
- `lang="en"` → `lang="es"`
- Title/description defaults → Spanish equivalents
- Nav links: "Projects" → "Proyectos", "Tech" → "Stack", "Ambitions" → "Metas"
- ADMIN → ADMIN (brand name, stays)

### Terminal / console (aesthetic-critical)
- Boot messages → Spanish
- Command help descriptions → Spanish
- `OS:`, `Shell:`, `Browser:` → keep labels in English, value translations where applicable
- `Status: Open for new challenges` → `Estado: Abierto a nuevos desafíos`
- `// HINT:` → `// PISTA:`
- `// CORE_SYSTEM_PROTOCOLS` → `// PROTOCOLOS_DEL_SISTEMA`

## Translation Style Rules

| Rule | Application |
|------|-------------|
| Neutral/professional Spanish | No regional slang; peninsular Spanish preferred |
| Uppercase tracking style preserved | `// HOJA_DE_RUTA` not `// Hoja de ruta` |
| `//` prefix preserved | All section headers keep `//` prefix |
| Status identifiers in English | ONLINE, BUSY, IN_PROGRESS, COMPLETED, etc. unchanged |
| Log level identifiers in English | MILESTONE, INFO, WARN unchanged |
| Code/project identifiers unchanged | `git-courer`, `hitro.es`, project names in `projects.json` |
| File names and URLs unchanged | No translation of paths, anchor IDs, or href values |
| Punctuation rules | Spanish: `¿`/`¡`, inverted exclamation/question marks used |
| Character limits | Keep strings concise — no wordy expansions |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | All translated strings render correctly | `astro dev` + manual walkthrough of every section |
| Completeness | No English strings remain | `grep -rn '"[A-Z][A-Z ]*"' src/ public/data/` — check for stragglers |
| Build | Site compiles | `astro build` — must succeed with zero errors |
| Admin | Admin panel navigable | Verify tabs, forms, and publish flow work |
| Terminal | Terminal commands function | Test `help`, `scan`, `whoami`, `status`, etc. |

## Migration / Rollout

No migration required. The change is purely cosmetic — all translations are static text replacements in source files. Rollback is `git checkout` of any changed file.

## Open Questions

- None
