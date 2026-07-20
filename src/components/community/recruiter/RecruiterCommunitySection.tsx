// Recruiter-face community section (React island).
//
// Single React island containing: the grid of project cards + the project
// detail modal. Card click opens the modal (README + docs on the left, full
// PR timeline on the right). Dot click pins the date as an inline label below
// the timeline (no modal on the recruiter face per spec).
//
// Mirrors the structure of dev/CommunityGrid.tsx but with face="recruiter"
// styling. We re-use ProjectDetailModal from the parent community/ dir.

import React, { useState } from 'react';
import type { CommunityProject, CommunityPR } from '../../../lib/community';
import ProjectDetailModal from '../ProjectDetailModal';
import PrDetailModal from '../dev/PrDetailModal';

interface Props {
  projects: CommunityProject[];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function RecruiterCommunitySection({ projects }: Props) {
  const [activeProject, setActiveProject] = useState<CommunityProject | null>(null);
  const [activePr, setActivePr] = useState<{ project: CommunityProject; pr: CommunityPR } | null>(null);
  const [pinnedDate, setPinnedDate] = useState<Record<string, string>>({});

  function togglePin(slug: string, pr: CommunityPR) {
    const key = `${slug}-${pr.number}`;
    setPinnedDate((prev) => {
      if (prev[slug] && prev[slug].includes(key)) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }
      return { ...prev, [slug]: key };
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((p) => {
          const inactiveStyle: React.CSSProperties = p.active
            ? {}
            : { filter: 'brightness(0.55) saturate(0.3)' };
          return (
            <article
              key={p.slug}
              data-community-slug={p.slug}
              style={inactiveStyle}
              className={`group relative bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:border-recruiter-accent/50 hover:shadow-[0_12px_36px_rgba(0,102,255,0.15)] ${
                p.active ? 'cursor-pointer' : ''
              }`}
            >
              <div
                role={p.active ? 'button' : undefined}
                tabIndex={p.active ? 0 : -1}
                onClick={() => p.active && setActiveProject(p)}
                onKeyDown={(e) => {
                  if (!p.active) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveProject(p);
                  }
                }}
                className="p-5 flex flex-col gap-4 outline-none focus:ring-2 focus:ring-recruiter-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="text-lg font-semibold text-white leading-tight truncate">
                      {p.name}
                    </h3>
                    <span className="text-xs text-white/40 tracking-wide truncate">
                      {p.owner}/{p.name}
                    </span>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-recruiter-accent-light hover:text-recruiter-accent transition-colors shrink-0 mt-1"
                    aria-label={`Repositorio de ${p.name}`}
                  >
                    Repo →
                  </a>
                </div>

                <div className="flex items-center gap-4 text-xs text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <span className="text-warn">★</span>
                    <span className="font-mono font-bold text-white">
                      {p.stars.toLocaleString('es-AR')}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-recruiter-accent-light">∉</span>
                    <span className="font-mono font-bold text-white">{p.prs.length}</span>
                    <span className="text-white/40">PRs merged</span>
                  </span>
                  {!p.active && (
                    <span className="text-[10px] text-warn border border-warn/40 bg-warn/5 px-1.5 py-0.5 tracking-widest uppercase">
                      INACTIVO
                    </span>
                  )}
                </div>

                {p.prs.length === 0 ? (
                  <p className="text-xs text-white/30">Sin PRs merged registrados.</p>
                ) : (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.prs.map((pr) => {
                        const key = `${p.slug}-${pr.number}`;
                        const isPinned = pinnedDate[p.slug] === key;
                        return (
                          <button
                            key={pr.number}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(p.slug, pr);
                            }}
                            className="group/dot relative w-3 h-3 rounded-full bg-recruiter-accent/70 hover:bg-recruiter-accent focus:bg-recruiter-accent focus:outline-none focus:ring-2 focus:ring-recruiter-accent/40 transition-all cursor-pointer"
                            aria-label={`PR #${pr.number} — ${formatDate(pr.mergedAt)}`}
                            title={`#${pr.number} — ${formatDate(pr.mergedAt)}`}
                          >
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-[#080c14] border border-white/10 text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover/dot:opacity-100 group-focus/dot:opacity-100 pointer-events-none transition-opacity">
                              {formatDate(pr.mergedAt)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {pinnedDate[p.slug] && (
                      <p className="text-xs text-recruiter-accent-light/80 tracking-wide">
                        {(() => {
                          const key = pinnedDate[p.slug];
                          const pr = p.prs.find((pr) => `${p.slug}-${pr.number}` === key);
                          if (!pr) return null;
                          return `#${pr.number} — ${formatDate(pr.mergedAt)}`;
                        })()}
                      </p>
                    )}
                    <p className="text-[10px] text-white/30 tracking-wide">
                      Click en los puntos para ver la fecha · Click en la card para ver el detalle
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <ProjectDetailModal
        project={activeProject}
        face="recruiter"
        onClose={() => {
          setActiveProject(null);
          setActivePr(null);
        }}
        onOpenPr={(pr) => {
          if (activeProject) setActivePr({ project: activeProject, pr });
        }}
      />

      <PrDetailModal
        project={activePr?.project ?? null}
        pr={activePr?.pr ?? null}
        face="recruiter"
        onClose={() => setActivePr(null)}
      />
    </>
  );
}
