export interface ProjectSpecStackUsage {
  name: string;
  color?: string;
  usageLevel: number;
}

export interface Project {
  id: string;
  name: string;
  photo: string;
  stack: string[];
  stackWithUsage?: ProjectSpecStackUsage[];
  architecture: string;
  initSequence: string;
  description?: string;
  businessImpact?: string;
  specs: Record<string, string | string[] | ProjectSpecStackUsage[]>;
  isHighlighted?: boolean;
  isPrivate?: boolean;
  isFavorite?: boolean;
  pushedAt?: string;
  order?: number;
  recruiterDescription?: string;
  recruiterStack?: string[];
  readmeContent?: string;
}

export interface TechTool {
  name: string;
  version: string;
  usageLevel: number; // 0-100
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERR' | 'MILESTONE';
  message: string;
}

export interface Ambition {
  id: string;
  section: 'short' | 'mid' | 'long';
  text: string;
  completed: boolean;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  period: string;
  description: string;
  tech: string[];
  url?: string;
  current?: boolean;
  impact?: string;
  logoUrl?: string;
}

export interface SiteSettings {
  availabilityValue: number;
  dustThresholdDays: number;
  starsForGold: number;
  status?: 'ONLINE' | 'OFFLINE' | 'BUSY';
  logLimit?: number;
  cvUrl?: string;
  linkedinUrl?: string;
  contactEmail?: string;
  birthDate?: string;
  versionMap?: Record<string, string>;
  roadmapLabels?: {
    short: { label: string; timeframe: string };
    mid: { label: string; timeframe: string };
    long: { label: string; timeframe: string };
  };
  bio?: string;
  photoUrl?: string;
}

export interface BuildEntry {
  buildNumber: number;
  status: 'SUCCESS' | 'FAIL';
  timestamp: string;
  files: string[];
}

// Recruiter-facing content. Bio is tailored for recruiters, featured projects
// carry manual non-technical descriptions, showcaseTech is a curated list of
// technology names shown on the recruiter page (replaces techstack.json there).
export interface RecruiterFeaturedProject {
  name: string;
  description: string; // manual, non-technical, written by admin
  stack: string[];
  repoUrl: string;
}

export interface RecruiterData {
  bio: string;
  photoUrl: string;
  cvUrl: string;
  linkedinUrl: string;
  featuredProjects: RecruiterFeaturedProject[];
  showcaseTech: string[];
}
