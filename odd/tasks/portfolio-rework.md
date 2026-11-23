# Portfolio rework

Full rework of the portfolio (Astro 5 + React 19 + Tailwind 4, Vercel): visual design/UX, content and copy, code and architecture, and the admin panel/backend.
Design-first: visual directions are explored as mockups under `design/` before any implementation.

## Specs

- S1 — User goal (verbatim): "quiero hacer un rework completo de todo el portfolio quiero mejorarlo hacerlo mejor y tal no tenvo claro el que pero esi"
- S2 — Objetivo: "Las dos cosas, como ahora" — keep serving both recruiters and developers (recruiter view `/` and dev view `/dev`), improving both.
- S3 — Estética: "Híbrido" — clean, modern base with terminal nods only in `/dev`.
- S4 — Alcance: "Diseño visual / UX de las páginas", "Contenido y copy", "Código y arquitectura", "Admin panel / backend".
- S5 — Arranque: "Mockups primero (Recommended)" — 2–3 visual directions on the canvas; the user picks one before implementation.
- S6 — /dev terminal (verbatim): "EN EL LADO DEV tenia una terminal interactiva eso estaba chulo" and "quiero conservar todos los comandos" — the /dev design keeps an interactive terminal with every command of `src/components/terminal/CoreConsole.tsx` (`COMMAND_LIST`: help, ls, cd, pwd, tree, cat, wget, scan, whoami, matrix, clear, exit, glitch, rm, regen, neofetch, top, coffee, ssh, stars, hire-me, sudo, approve, plus `help -a`).
- S7 — Canvas (verbatim): "enel canvas no va" — the interactive terminal in `05-dev-terminal.html` must work when viewed in the design canvas.
- S8 — Language (verbatim): "y todo en español españa no argentino profa" — all site copy in Spain Spanish (tú).
- S9 — Remove (verbatim L16/L17): "bitacora realmente no la actulaizo nunca fuera", "lo de oro polvo tampoco mola fuera", "Google Analytics sin aviso de cookies" → "Vercel Web Analytics (Recomendado)", PRs "no me gusta escribir mejor ponemos open source pr y enlaces y ya" (no Gemini, no summaries). Accepted proposals (L21 "todo ok"): availability % bar → "Disponible para trabajar"; "Comunidad" nav + /dev/comunidad folded into Open source; delete dead code (experience components, AdminPanel*.bak, unused stubs).
- S10 — Keep (verbatim): "panel admin me salva tio asi cambio y ajusto rapido"; Google Translate: "pues dejamos google transletor no pasa nada no?".
- S11 — Stack (verbatim): "Lista simple sin porcentajes (Recomendado)" and "sabes que el stack lo hago a mano mejor que autohecho" — grouped manual list edited in the admin, no percentages.
- S12 — Designs: recruiter `/` implements `design/portfolio-rework/04-editorial-sidebar.html`; `/dev` implements `design/portfolio-rework/05-dev-terminal.html` (interactive terminal with all CoreConsole commands). Content facts from Log L6, L7, L9, L14: no featured "main" project, contact band at top, contact links only once, Valencia (not Madrid), color profile photo.

## Tasks

- T1 — S1-S5 — Design system sync + recruiter home directions (`design/portfolio-rework/`) — inline — commit: see T-docs
- T2 — S2-S3, S6-S8 — `/dev` mockup with interactive terminal — inline + worker — commit: see T-docs
- T4 — S9-S10 — Remove features and dead code (bitácora/GitBook, gold/dust ranking, GA/GTM → Vercel Analytics, Gemini + PR summaries, community page, availability %, experience, .bak) keeping the build green — worker — commit: pending
- T3 — S8, S11-S12 — Content data and copy: Valencia, Spain Spanish, stack groups without percentages, stale logs, README — worker — commit: pending
- T5 — S8, S12 — Implement recruiter `/` from artboard 04 — worker — commit: pending
- T6 — S6, S8, S12 — Implement `/dev` from artboard 05 (DOM terminal with all commands) — worker — commit: pending
- T7 — S10-S11, S9 — Admin panel aligned with the new data (stack groups, no levels, no Gemini/summaries, removed settings) — worker — commit: pending

## Log

- L1 — Original request (verbatim): "quiero hacer un rework completo de todo el portfolio quiero mejorarlo hacerlo mejor y tal no tenvo claro el que pero esi"
- L2 — Answers: Objetivo "Las dos cosas, como ahora"; Estética "Híbrido"; Alcance: all four (visual/UX, content/copy, code/architecture, admin/backend); Arranque "Mockups primero (Recommended)".
- L3 — Exploration delegated (gentle-ai-explore, task mwt6uxc6-1-i45t) for design tokens, page structure and real content.
- L4 — Design system synced to `design/system.md` + `design/system.html` from `src/styles/global.css`, `BaseLayout.astro`, `index.astro`. Recruiter home directions written to `design/portfolio-rework/`: `01-editorial.html`, `02-bento.html`, `03-split-sidebar.html`. Awaiting the user's choice.
- L5 — Findings to carry into T3/T4: `/#contact` nav link is dead (Contact.astro not rendered); ES/EN is Google Translate with DOM monkey-patches (no real i18n); experience components dead; `/dev` is all `client:only` (no SSR); GTM without consent banner; stale log "11 estrellas" vs 43★; low contrast `text-white/40`; dev animations ignore `prefers-reduced-motion`.
- L6 — User (verbatim): "uqiero una mezcla entre 1 y 3 y git courer ya no es el proyecto principal ahi no ponemos nada ok?" → new artboard `04-editorial-sidebar.html` (sidebar from 03, editorial hero + case studies from 01). git-courer no longer presented as main project; no project is featured as main; hero facts no longer cite git-courer stars.
- L7 — User (verbatim): "el contaco arriba de el todo para que este con presencia" → in `04-editorial-sidebar.html` the contact block moved to the very top of the content (above the hero) as a highlighted band; bottom contact section removed; "Contacto" is first in the sidebar index.
- L8 — User (verbatim): "me cierra" → `04-editorial-sidebar.html` approved as the recruiter home direction.
- L9 — User (verbatim): "bueno una cosa mi foto que esta en el repo y vivo en valencia" and "y tambien hay dos veces lo mismo" (screenshots: sidebar GitHub/LinkedIn/email vs top contact band) → avatar uses `public/profile.jpg` (embedded), location changed from Madrid to Valencia ("Valencia o remoto"), contact links live only in the top band (email, LinkedIn, GitHub, CV); sidebar keeps photo, name, role, status, index and the /dev link. T3 must update Madrid → Valencia in `README.md` and site copy.
- L10 — User (verbatim): "y todo en español españa no argentino profa" → all site copy in Spain Spanish (tú, never voseo). Fixed in artboards 01/03/04 (¿Buscas, ¿Eres dev?, Mira). Applies to T3/T5/T6 copy.
- L11 — T2: `/dev` mockup `05-dev-terminal.html` written in the 04 direction with terminal styling (dev tokens: carbono, cobalt, sharp corners, mono).
- L12 — User (verbatim): "EN EL LADO DEV tenia una terminal interactiva eso estaba chulo" → `05-dev-terminal.html` now opens with an interactive terminal panel (help, whoami, ls, cd, pwd, cat, neofetch, log, stars, wget cv.pdf, hire-me, sudo, clear; ↑↓ history, Tab completion, quick-command chips). The log panel is replaced by the `log` command. Mirrors commands from `src/components/terminal/CoreConsole.tsx`.
- L13 — User (verbatim): "quiero conservar todos los comandos y por cierto enel canvas no va" → S6, S7 added; T2 reopened: port all CoreConsole commands into the 05 artboard and make the terminal work in the canvas.
- L14 — User (verbatim): "y la foto esta en blaco y negro mira" → remove the grayscale filter from the /dev photo (`.whoami img`); relayed to the T2 worker editing the same file.
- L15 — User (verbatim): "y por cierto tambien despues de darle un aire visual mas marcado que es lo que estamos haciendo quiero eliminar o cambiar algunas funciones que realemten no merecen la pena"
- L16 — Answers (verbatim): public side: "bitacora realmente no la actulaizo nunca fuera y lo de oro polvo tampoco mola fuera tambien el stack no se que hacer con eso y seguro que tambien hay cosa que dices ufff es que esto raro" + selected "Traductor de Google ES/EN", "Google Analytics sin aviso de cookies". Admin/backend: "panel admin me salva tio asi cambio y ajusto rapido gemini la verdad no se pero quiero manterlo solo o lo ponemos simplemtene los bodys de las pr o no se o sin nada no se tio no se". Decided: remove bitácora (GitBook import, /bitacora, /dev/bitacora, prebuild script); remove gold/dust ranking; change Google Translate and GA; KEEP admin panel. Open: translator replacement, analytics replacement, stack section, Gemini.
- L17 — Answers (verbatim): Idioma "pues dejamos google transletor no pasa nada no?"; Analítica "Vercel Web Analytics (Recomendado)"; Stack "Lista simple sin porcentajes (Recomendado)"; PRs "no me gusta escribir mejor ponemos open source pr y enlaces y ya". Decided: KEEP Google Translate; replace GA with Vercel Web Analytics; stack = grouped list without percentages; open-source PRs = title + links only, no summary, remove Gemini.
- L18 — T2 worker (mwt7co4u-2-grvo) done: all 24 CoreConsole commands + `help -a` + `log` ported to `05-dev-terminal.html`; canvas root cause = iframe `sandbox="allow-scripts"` without `allow-forms` blocked the `<form>` submit → replaced with keydown Enter; canvas needs one click on the artboard to enter interact mode; photo in color. Verified with Playwright (file:// and live canvas). Mockups 04/05 updated: PR shown as title + links, stack as grouped list without levels.
- L19 — User (verbatim): "sabes que el stack lo hago a mano mejor que autohecho" → stack content is curated manually by the user (edited in the admin panel / techstack.json), never derived automatically from repos; groups and items in the mockups are placeholders for his own list.
- L20 — Feature changes for implementation (T5–T7): remove bitácora (GitBook prebuild, /bitacora, /dev/bitacora); remove gold/dust ranking (`starsForGold`, `dustThresholdDays`); remove GA/GTM → add Vercel Web Analytics; keep Google Translate; remove Gemini (`src/lib/gemini.ts`) and PR summaries; stack manual grouped list without percentages; proposed (pending user objection): availability % bar → "Disponible para trabajar", "Comunidad" nav + /dev/comunidad folded into Open source, delete dead code (experience components, AdminPanel*.bak, duplicated recruiter/dev components). Admin panel stays.
- L21 — User (verbatim): "todo ok" → `05-dev-terminal.html` approved for /dev; proposed removals accepted; no experience provided → no experience section (remove dead experience components). T2 done.
- L22 — User (verbatim): "gemini no quiero que se mantenga se pondira la cabezera de el pr y ya" → confirms S9: Gemini removed completely; PRs show only their title (header) + links. Relayed to T4 worker.
- L23 — User (verbatim): "y todo el backend de disponibilidad y esas mierdas fuera osea cosas que realmetne no sirven para nada a to mar por el culo" → S9 extended: availability/status system removed end to end (static "Disponible para trabajar" copy only); any backend/lib code without a real consumer removed. Kept: admin + auth, GitHub sync, terminal, Google Translate, Vercel Analytics. Relayed to T4 worker.
- L24 — User (verbatim): "status borralo sabe" → terminal `status` command removed (S6 updated, artboard 05 updated, relayed to T4 worker for `src/components/terminal/**`). WHOAMI panel badge "● online" → "disponible para trabajar".
- L25 — User (verbatim): "si" (to removing the WHOAMI label too) → WHOAMI panel header has no status/availability label at all in artboard 05.
