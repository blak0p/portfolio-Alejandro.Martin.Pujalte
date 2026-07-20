// Dev-face community grid.
//
// Mirrors deployments/ProjectGrid.tsx (React island, client:only="react").
// Renders one CommunityCard per project; click a PR dot to open CommunityModal
// with the PR title, summary and link. Empty state mirrors the dev face's
// SIN_* convention.

import React, { useState } from 'react';
import type { CommunityProject, CommunityPR } from '../../../lib/community';
import CommunityCard from './CommunityCard';
import CommunityModal from './CommunityModal';

interface CommunityGridProps {
  projects: CommunityProject[];
}

export default function CommunityGrid({ projects }: CommunityGridProps) {
  const [active, setActive] = useState<{ project: CommunityProject; pr: CommunityPR } | null>(null);

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
            onOpenPr={(pr) => setActive({ project: p, pr })}
          />
        ))}
      </div>

      <CommunityModal
        project={active?.project ?? null}
        pr={active?.pr ?? null}
        onClose={() => setActive(null)}
      />
    </>
  );
}