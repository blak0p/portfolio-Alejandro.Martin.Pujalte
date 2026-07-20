// Dev-face community card.
//
// Mirrors deployments/ProjectCard.tsx: sharp corners, carbon + cobalt,
// monospace, // SECTION header convention. Shows repo name, owner, stars and
// PR count, plus a horizontal dot timeline (one dot per merged PR, oldest→
// newest). Clicking a dot opens the dev CommunityModal (handled by parent).

import React from 'react';
import type { CommunityProject, CommunityPR } from '../../../lib/community';

interface CommunityCardProps {
  project: CommunityProject;
  onOpenPr: (pr: CommunityPR) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function CommunityCard({ project, onOpenPr }: CommunityCardProps) {
  const { name, owner, stars, prs, url, active } = project;
  const inactiveStyle: React.CSSProperties = active ? {} : { filter: 'brightness(0.55) saturate(0.3)' };

  return (
    <div data-community-slug={project.slug} className="@container">
      <div
        className={`relative border bg-carbono-surface p-3 flex flex-col gap-3 transition-all duration-150 ${
          active ? 'border-white/15 hover:border-cobalt/60' : 'border-white/10 opacity-70'
        }`}
        style={inactiveStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white tracking-widest uppercase truncate">
              {name}
            </span>
            <span className="text-[10px] text-text-faint tracking-widest truncate">
              {owner}/{name}
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-cobalt hover:text-cobalt-light tracking-widest uppercase shrink-0"
            aria-label={`Repositorio de ${name}`}
          >
            REPO →
          </a>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-text-muted tracking-widest uppercase">
          <span className="inline-flex items-center gap-1">
            <span className="text-warn">★</span>
            <span className="text-white font-bold">{stars}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-cobalt">#</span>
            <span className="text-white font-bold">{prs.length}</span>
            <span className="text-text-faint">PRS</span>
          </span>
          {!active && (
            <span className="text-[10px] text-warn border border-warn/40 bg-warn/5 px-1.5 py-0.5 tracking-widest uppercase">
              INACTIVO
            </span>
          )}
        </div>

        {/* Dot timeline */}
        {prs.length === 0 ? (
          <p className="text-[10px] text-text-faint tracking-widest uppercase">SIN_PRS</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {prs.map((pr) => (
                <button
                  key={pr.number}
                  type="button"
                  onClick={() => onOpenPr(pr)}
                  className="group/dot relative w-2.5 h-2.5 bg-cobalt/70 hover:bg-cobalt focus:bg-cobalt focus:outline-none focus:ring-1 focus:ring-cobalt/50 transition-all cursor-pointer"
                  style={{ borderRadius: '50%' }}
                  aria-label={`PR #${pr.number} — ${formatDate(pr.mergedAt)}`}
                  title={`#${pr.number} — ${formatDate(pr.mergedAt)}`}
                >
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-carbono border border-white/15 text-[9px] text-text-muted tracking-widest whitespace-nowrap opacity-0 group-hover/dot:opacity-100 group-focus/dot:opacity-100 pointer-events-none transition-opacity">
                    {formatDate(pr.mergedAt)}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-[9px] text-text-faint/60 tracking-widest uppercase">
              {prs.length} PR · click para detalle
            </span>
          </div>
        )}
      </div>
    </div>
  );
}