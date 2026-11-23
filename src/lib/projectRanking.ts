import type { Project } from '../types';

export const PROJECTS_AUTO_REFRESH_LIMIT = 5;

// Projects keep a manual order: the order of public/data/projects.json
// (Array.prototype.sort is stable, so equal `order` values keep array order).
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getAutoRefreshProjects(projects: Project[], limit = PROJECTS_AUTO_REFRESH_LIMIT): Project[] {
  return sortProjects(projects).slice(0, limit);
}
