// Community / OSS Contributions — shared types and data accessor.
//
// This module is the single source of truth for the community data shape.
// Both faces (recruiter inline section + dev dedicated page) and the cron
// import from here, so the JSON contract lives in one place.

export interface CommunityPR {
  number: number;
  title: string;
  url: string;            // canonical GitHub PR URL
  mergedAt: string;       // ISO 8601
  summary: string | null; // null => Gemini failed; UI renders "no se pudo hacer el resumen"
  summaryError?: string;  // only present when summary is null
}

export interface CommunityProject {
  slug: string;           // "owner-name", derived
  owner: string;
  name: string;
  url: string;            // https://github.com/owner/name
  stars: number;
  active: boolean;        // gates cron fetch (mirror of admin state at fetch time)
  addedAt: string;        // ISO 8601, admin-set
  lastSyncedAt: string | null;
  readme?: string;        // markdown readme content (populated by cron at sync time)
  prs: CommunityPR[];     // oldest => newest by mergedAt
}

export interface CommunityData {
  version: 1;
  generatedAt: string | null; // ISO 8601, null when no data has been generated yet
  totalMerged: number;        // sum of prs.length across projects
  projects: CommunityProject[];
}

// Admin-managed repo entry persisted in Vercel KV under `community:repos`.
// stars/lastSyncedAt are NOT stored here — they live in community.json and
// the admin tab joins them for display.
export interface CommunityRepoState {
  owner: string;
  name: string;
  active: boolean;
  addedAt: string; // ISO 8601
}

export const EMPTY_COMMUNITY_DATA: CommunityData = {
  version: 1,
  generatedAt: null,
  totalMerged: 0,
  projects: [],
};