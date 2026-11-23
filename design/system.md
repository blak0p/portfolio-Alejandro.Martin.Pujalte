# Design system — portfolio (synced from source)

Sources read: `src/styles/global.css` (`@theme`, lines 4–31), `tailwind.config.mjs` (content globs only, no tokens), `src/layouts/BaseLayout.astro` (`--bgPage` via `define:vars`), `src/pages/index.astro` (recruiter background).

## Colors — surfaces (dev)

| Token | Value | Usage | Source |
|---|---|---|---|
| `--color-carbono` | `#0d0d0d` | Dev page background | `src/styles/global.css` |
| `--color-carbono-low` | `#080808` | Deepest surface | `src/styles/global.css` |
| `--color-carbono-surface` | `#121212` | Panels, cards | `src/styles/global.css` |
| `--color-carbono-mid` | `#181818` | Hover surfaces | `src/styles/global.css` |
| `--color-carbono-high` | `#222222` | Raised surface | `src/styles/global.css` |
| `--color-carbono-highest` | `#2a2a2a` | Scrollbar thumb, code background | `src/styles/global.css` |

## Colors — accent

| Token | Value | Usage | Source |
|---|---|---|---|
| `--color-cobalt` | `#0055ff` | Dev accent: tabs, underline, selection, focus ring | `src/styles/global.css` |
| `--color-cobalt-dark` | `#0039b3` | Pressed accent | `src/styles/global.css` |
| `--color-cobalt-light` | `#3377ff` | Hover accent | `src/styles/global.css` |
| `--color-recruiter-accent` | `#0066FF` | Recruiter accent (button fills with white text) | `src/styles/global.css` |
| `--color-recruiter-accent-light` | `#38BDF8` | Recruiter links and hover (use for accent text on dark) | `src/styles/global.css` |
| `--color-recruiter-accent-dark` | `#0033AA` | Recruiter pressed accent | `src/styles/global.css` |

## Colors — text and state

| Token | Value | Usage | Source |
|---|---|---|---|
| `--color-text-primary` | `#ffffff` | Headings, primary text | `src/styles/global.css` |
| `--color-text-muted` | `#e2e4f0` | Body text | `src/styles/global.css` |
| `--color-text-faint` | `#9ea4c0` | Metadata, labels | `src/styles/global.css` |
| `--color-warn` | `#ffcc00` | BUSY status | `src/styles/global.css` |
| `--color-err` | `#ff4444` | Errors, classified | `src/styles/global.css` |
| `--color-bronze` | `#b87333` | Starred project highlight | `src/styles/global.css` |
| `--color-bronze-light` | `#d4944a` | Star count text | `src/styles/global.css` |
| `--color-bronze-dark` | `#8a5520` | Bronze border | `src/styles/global.css` |

## Page backgrounds

| Token | Value | Usage | Source |
|---|---|---|---|
| `--bgPage` (recruiter) | `#080c14` | Recruiter page background | `src/layouts/BaseLayout.astro` |
| `--bgPage` (dev) | `#0d0d0d` | Dev page background | `src/layouts/BaseLayout.astro` |

## Typography

| Token | Value | Usage | Source |
|---|---|---|---|
| `--font-mono` | `'IBM Plex Mono', monospace` | Dev body, labels, code | `src/styles/global.css` |
| `--font-size-xs` | `10px` | Dev micro labels (likely not wired to Tailwind v4) | `src/styles/global.css` |
| `--font-size-sm` | `12px` | Dev small text | `src/styles/global.css` |
| `--font-size-base` | `13px` | Dev base | `src/styles/global.css` |
| `--font-size-lg` | `16px` | Dev large | `src/styles/global.css` |
| `--font-size-xl` | `20px` | Dev headings | `src/styles/global.css` |

Recruiter body uses Tailwind's default `font-sans`. Artboards cannot load IBM Plex Mono (no remote fonts), so they use the system monospace stack as its stand-in.

## Radius

| Token | Value | Usage | Source |
|---|---|---|---|
| `--border-radius-none` | `0` | Dev: sharp corners (invalid v4 key, enforced via `.sharp-corner`) | `src/styles/global.css` |
| `--border-radius-DEFAULT` | `0` | Dev default (invalid v4 key) | `src/styles/global.css` |

Recruiter uses Tailwind `rounded-3xl` (hero card) and `rounded-full` (badges).

## Shadows

| Token | Value | Usage | Source |
|---|---|---|---|
| `.industrial-panel` | `inset 0 1px 0 rgba(255,255,255,.05), inset 0 -1px 0 rgba(0,0,0,.5), 0 4px 12px rgba(0,0,0,.5)` | Dev panels | `src/styles/global.css` |
| Section underline glow | `0 0 10px rgba(0,85,255,0.3)` | Dev section title underline | `src/styles/global.css` |
| Recruiter hero | `0 20px 50px rgba(0,0,0,0.4)` | Hero card | `src/pages/index.astro` |

## Component rules

- Dev: sharp corners, `border-white/15` 1px borders, `// SECTION_NAME` headings in mono uppercase with a 2px cobalt underline.
- Recruiter: rounded cards, sans body, accent `#0066FF` fills, `#38BDF8` text links.
- Accent text on dark backgrounds uses `--color-recruiter-accent-light` (`#0066FF` text on `#080c14` fails AA for small text).
- Status shown with a label plus color (ONLINE / BUSY), never color alone.
- Terminal effects (scanlines, CRT, glitch) belong to `/dev` only and must respect `prefers-reduced-motion`.
