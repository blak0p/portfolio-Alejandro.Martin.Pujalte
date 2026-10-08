# Branch Protection & GitHub Ruleset Configuration

This guide documents how to protect the default branch (`main`) for the `blak0p/portfolio-Alejandro.Martin.Pujalte` repository.

## Objective & Governance Strategy

As a solo maintainer repository:
1. **Force PR Flow**: All proposed changes should go through Pull Requests to keep a clean commit history, run automated checks (CI/build), and maintain traceability.
2. **0 Required Approvals**: GitHub requires 0 approvals so the repository owner (`blak0p`) can merge their own pull requests without waiting on external reviewers.
3. **Admin Bypass**: Repository administrator/owner is configured with bypass permissions for emergency hotfixes.
4. **Immutability of Main**: Direct commits to `main`, force pushes (`git push --force`), and branch deletion are strictly blocked.

---

## Method 1: GitHub Web UI (GitHub Rulesets - Recommended)

GitHub Repository Rulesets are the modern, flexible replacement for legacy branch protection rules.

### Step-by-Step Instructions

1. Navigate to the repository on GitHub:
   `https://github.com/blak0p/portfolio-Alejandro.Martin.Pujalte`
2. Go to **Settings** > **Rules** > **Rulesets** (in the left sidebar under *Code and automation*).
3. Click **New ruleset** > **New branch ruleset**.
4. Configure General Settings:
   - **Ruleset Name**: `Protect main`
   - **Enforcement status**: `Active`
5. Configure Bypass list:
   - Under **Bypass list**, click **Add bypass**.
   - Select **Repository admin** (Role: Repository admin) or select user **`blak0p`**.
   - Set bypass mode to **Always** (or *For pull requests only* depending on preference).
6. Configure Target branches:
   - Under **Target branches**, click **Add target** > **Include default branch** (which targets `main`).
7. Configure Branch Protections:
   - [x] **Restrict deletions**: Check to prevent deleting `main`.
   - [x] **Block force pushes**: Check to prevent rewriting history on `main`.
   - [x] **Require a pull request before merging**:
     - **Required approvals**: Set to `0` (enforces PR workflow while allowing self-merge).
     - **Dismiss stale pull request approvals when new commits are pushed**: Checked (optional).
     - **Require review from Code Owners**: Unchecked (or checked if desired).
   - [x] **Require status checks to pass** (Optional, once CI workflows are set up):
     - Require branches to be up to date before merging.
8. Click **Create** (or **Save changes**).

---

## Method 2: GitHub CLI (`gh api`)

You can create or update the ruleset directly using the GitHub CLI (`gh`).

### 1. Ruleset Definition JSON

Create a ruleset configuration file (e.g., `ruleset.json`):

```json
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [
    {
      "actor_id": 1,
      "actor_type": "RepositoryRole",
      "bypass_mode": "always"
    }
  ],
  "conditions": {
    "ref_name": {
      "include": [
        "~DEFAULT_BRANCH"
      ],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    }
  ]
}
```

### 2. Apply via `gh api`

Run the following command in terminal with authenticated `gh`:

```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/blak0p/portfolio-Alejandro.Martin.Pujalte/rulesets \
  --input ruleset.json
```

### 3. Verify Existing Rulesets via `gh api`

```bash
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/blak0p/portfolio-Alejandro.Martin.Pujalte/rulesets
```

---

## Legacy Branch Protection (Alternative)

If using legacy branch protection instead of Rulesets:
1. Go to **Settings** > **Branches**.
2. Click **Add branch protection rule**.
3. **Branch name pattern**: `main`.
4. Check **Require a pull request before merging**.
   - Set **Require approvals**: `0` (if UI allows, or leave unchecked with required status checks).
5. Ensure **Do not allow bypassing the above settings** is **UNCHECKED** so repository administrator (`blak0p`) can bypass if necessary.
6. Check **Do not allow force pushes**.
7. Check **Do not allow deletions**.
8. Click **Save changes**.
