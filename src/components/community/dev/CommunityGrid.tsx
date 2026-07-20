// Dev-face community grid.
//
// Mirrors deployments/ProjectGrid.tsx (React island, client:only="react").
// Renders one CommunityCard per project.
// - Click a project CARD → opens ProjectDetailModal (README + timeline).
// - Click a PR DOT in the card OR in the project detail modal → opens
//   PrDetailModal (summary + link to PR).
// Empty state mirrors the dev face's SIN_* convention.

import React, { useState } from 'react';
import type { CommunityProject, CommunityPR } from '../../../lib/community';
import CommunityCard from './CommunityCard';
import PrDetailModal from './PrDetailModal';
import ProjectDetailModal from '../ProjectDetailModal';

interface CommunityGridProps {
  projects: CommunityProject[];
}

type ActivePr = { project: CommunityProject; pr: CommunityPR };

export default function CommunityGrid({ projects }: CommunityGridProps) {
  const [activeProject, setActiveProject] = useState<CommunityProject | null>(null);
  const [activePr, setActivePr] = useState<ActivePr | null>(null);

  if (projects.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-text-faint tracking-widest">
        SIN_CONTRIBUCIONES
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 @xs:grid-cols-2 @md:grid-cols-3 gap-1.5">
        {projects.map((p) => (
          <CommunityCard
            key={p.slug}
            project={p}
            onOpenProject={() => setActiveProject(p)}
            onOpenPr={(pr) => setActivePr({ project: p, pr })}
          />
        ))}
      </div>

      <ProjectDetailModal
        project={activeProject}
        face="dev"
        onClose={() => setActiveProject(null)}
        onOpenPr={(pr) => {
          if (activeProject) setActivePr({ project: activeProject, pr });
        }}
      />

      <PrDetailModal
        project={activePr?.project ?? null}
        pr={activePr?.pr ?? null}
        face="dev"
        onClose={() => setActivePr(null)}
      />
    </>
  );
}
