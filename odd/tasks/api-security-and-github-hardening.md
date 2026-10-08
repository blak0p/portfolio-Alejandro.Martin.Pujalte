# Feature: API Security & GitHub Hardening

## Objective
Harden backend API endpoints (`/api/github`, `/api/admin/community`) against unauthorized access and remote code injection, implement secure server-side session management (`HttpOnly` signed cookies), and configure GitHub repository templates, security policy, and branch protection guidance.

## Problem
Currently, `/api/github` allows any caller on the public internet to trigger `publish` (creating git commits and updating branches via server-side `GITHUB_TOKEN`) and `uploadCv`. Similarly, `/api/admin/community` allows mutating KV community repos with zero authorization. The frontend `/admin` gate only checks `sessionStorage`, leaving API routes entirely vulnerable.

## Why
Security must be enforced at the server layer (defense-in-depth). API endpoints with write access or GitHub credentials must require a verified, tamper-proof admin session. Furthermore, GitHub repo templates, security disclosure policies, and branch protection rules ensure repository integrity.

## Scope
- In Scope:
  - Server-side session verification helper (`src/lib/auth-server.ts`) using secure HMAC token generation and verification.
  - Session cookie emission in `src/pages/api/github-auth.ts` and `src/pages/api/auth.ts`.
  - Authentication gates on mutating actions in `src/pages/api/github.ts` (`publish`, `uploadCv`) and `src/pages/api/admin/community.ts` (`add`, `toggle`, `remove`).
  - GitHub issue templates, PR template, and `SECURITY.md`.
  - Branch protection rules documentation/configuration guidance for owner bypass and PR requirements.
- Out of Scope:
  - Modifying public read actions in `/api/github` (`getActivity`, etc.) that are already public.
  - Third-party auth providers beyond existing GitHub OAuth and admin password.

## Constraints
- Astro SSR/API routes in Vercel environment.
- Native Web Crypto API / Node crypto for HMAC signatures without heavy external dependencies.
- Conventional commits for every work-unit commit.
- No AI attribution in commit messages.

## Tasks
- [x] `TASK-1`: Implement server session management helper in `src/lib/auth-server.ts` (HMAC cookie signing and verification).
- [x] `TASK-2`: Update login endpoints (`/api/github-auth.ts`, `/api/auth.ts`) to issue signed `HttpOnly` session cookies on successful authentication.
- [x] `TASK-3`: Secure mutating actions in `src/pages/api/github.ts` and `src/pages/api/admin/community.ts` with session verification.
- [x] `TASK-4`: Add GitHub templates and security policy (`.github/ISSUE_TEMPLATE/*.yml`, `.github/pull_request_template.md`, `SECURITY.md`).
- [x] `TASK-5`: Document and verify GitHub branch protection rules (0 required reviews, admin bypass for owner).

## Delivery Forecast
- Strategy: `ask-on-risk`
- Authorize changed lines forecast: ~250 lines
