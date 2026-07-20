// Project detail modal — opened when the user clicks the project card itself
// (not a dot). Shows README + docs on the left, full PR timeline on the right.
// Mirrors the original description: "al lado lo que es básicamente el readme y
// los docs como ya tenemos, y al otro lado la timstat en linea con puntos".
//
// Used by both the recruiter and dev faces. The recruiter face mounts this as
// a React island; the dev face also mounts it. Shared via a small render-prop
// pattern: the parent owns the open/close state and the project; this component
// only renders.

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import type { CommunityProject, CommunityPR } from '../../lib/community';

interface ProjectDetailModalProps {
  project: CommunityProject | null;
  face: 'recruiter' | 'dev';
  onClose: () => void;
  /** Called when the user clicks a dot in the right-side timeline. */
  onOpenPr?: (pr: CommunityPR) => void;
}

const NO_README = 'README no disponible todavía. La próxima ejecución del cron lo traerá.';

export default function ProjectDetailModal({ project, face, onClose, onOpenPr }: ProjectDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [project, onClose]);

  // Focus trap
  useEffect(() => {
    if (!project) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables()[0];
    first?.focus();

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    dialog.addEventListener('keydown', onTab);
    return () => {
      dialog.removeEventListener('keydown', onTab);
      previouslyFocused?.focus?.();
    };
  }, [project]);

  if (!project) return null;

  const isRecruiter = face === 'recruiter';
  const readmeHtml = project.readme
    ? (marked.parse(project.readme) as string)
    : null;

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  };

  // Palette
  const palette = isRecruiter
    ? {
        bg: 'bg-[#080c14]/95',
        border: 'border-white/10',
        textPrimary: 'text-white',
        textSecondary: 'text-white/60',
        textMuted: 'text-white/40',
        accent: 'text-recruiter-accent-light',
        accentBg: 'bg-recruiter-accent',
        divider: 'border-white/10',
        dot: 'bg-recruiter-accent/70 hover:bg-recruiter-accent',
        ring: 'focus:ring-recruiter-accent/40',
        sectionLabel: 'text-recruiter-accent-light/70',
      }
    : {
        bg: 'bg-carbono-surface',
        border: 'border-white/15',
        textPrimary: 'text-white',
        textSecondary: 'text-text-muted',
        textMuted: 'text-text-faint',
        accent: 'text-cobalt',
        accentBg: 'bg-cobalt',
        divider: 'border-white/15',
        dot: 'bg-cobalt/70 hover:bg-cobalt',
        ring: 'focus:ring-cobalt/50',
        sectionLabel: 'text-cobalt',
      };

  const container = (
    <>
      <div
        className="fixed inset-0 z-[9990] bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-[9991] flex items-center justify-center sm:p-4 pointer-events-none"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${project.name}`}
          className={`${palette.bg} ${palette.border} w-full sm:max-w-5xl ${isRecruiter ? 'font-sans rounded-2xl' : 'font-mono'} border pointer-events-auto flex flex-col h-full sm:h-auto sm:max-h-[88vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b ${palette.divider} px-5 py-3 shrink-0 gap-3`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs ${palette.accent} tracking-widest uppercase shrink-0`}>
                {project.owner}/
              </span>
              <span className={`text-sm font-bold ${palette.textPrimary} ${isRecruiter ? '' : 'tracking-widest uppercase'} truncate`}>
                {project.name}
              </span>
              {!project.active && (
                <span className={`text-[10px] text-warn border border-warn/40 bg-warn/5 px-1.5 py-0.5 tracking-widest uppercase shrink-0`}>
                  INACTIVO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs ${palette.accent} hover:underline tracking-widest uppercase`}
              >
                → Ver en GitHub
              </a>
              <button
                onClick={onClose}
                className={`text-xs ${palette.textMuted} hover:${palette.textPrimary} tracking-widest border ${palette.border} px-2 py-1 hover:border-white/40 transition-colors duration-100 shrink-0 cursor-pointer`}
                aria-label="Cerrar"
              >
                [ESC]
              </button>
            </div>
          </div>

          {/* Two-column body */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-0">
            {/* LEFT: README + docs */}
            <div className={`overflow-y-auto p-5 border-b md:border-b-0 md:border-r ${palette.divider} flex flex-col gap-4`}>
              <div className="flex items-center gap-4 text-xs">
                <span className={`inline-flex items-center gap-1 ${palette.textSecondary}`}>
                  <span className="text-warn">★</span>
                  <span className={`font-bold ${palette.textPrimary}`}>{project.stars.toLocaleString('es-AR')}</span>
                </span>
                <span className={`inline-flex items-center gap-1 ${palette.textSecondary}`}>
                  <span className={palette.accent}>#</span>
                  <span className={`font-bold ${palette.textPrimary}`}>{project.prs.length}</span>
                  <span className={palette.textMuted}>PRS</span>
                </span>
                <span className={`text-[10px] ${palette.textMuted} tracking-widest uppercase`}>
                  AGREGADO {fmtDate(project.addedAt)}
                </span>
              </div>

              <div>
                <p className={`text-xs ${palette.sectionLabel} tracking-widest uppercase mb-2`}>
                  // README & DOCS
                </p>
                {readmeHtml ? (
                  <div
                    className={`readme-content text-xs ${palette.textSecondary} leading-relaxed prose prose-invert max-w-none`}
                    dangerouslySetInnerHTML={{ __html: readmeHtml }}
                  />
                ) : (
                  <p className={`text-xs ${palette.textMuted} italic`}>
                    {NO_README}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: timeline with dots */}
            <div className="overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className={`text-xs ${palette.sectionLabel} tracking-widest uppercase`}>
                  // TIMELINE — {project.prs.length} PR{Math.abs(project.prs.length) === 1 ? '' : 'S'} MERGED
                </p>
                <span className={`text-[10px] ${palette.textMuted} tracking-widest uppercase`}>
                  ORDEN: OLDEST → NEWEST
                </span>
              </div>

              {project.prs.length === 0 ? (
                <p className={`text-xs ${palette.textMuted} italic`}>
                  Sin PRs merged registrados.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {project.prs.map((pr: CommunityPR) => {
                    const summary = pr.summary;
                    return (
                      <button
                        key={pr.number}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPr?.(pr);
                        }}
                        className={`text-left p-3 ${palette.border} border ${palette.dot.includes('cobalt') ? 'hover:border-cobalt/60' : 'hover:border-recruiter-accent/60'} transition-all duration-150 cursor-pointer group/pr`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`shrink-0 mt-1.5 w-3 h-3 rounded-full ${palette.dot} transition-all`}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] ${palette.accent} tracking-widest uppercase font-bold`}>
                                #{pr.number}
                              </span>
                              <span className={`text-[10px] ${palette.textMuted} tracking-widest uppercase`}>
                                {fmtDate(pr.mergedAt)}
                              </span>
                              {summary === null && (
                                <span className={`text-[9px] text-err/80 tracking-widest uppercase italic`}>
                                  · sin resumen
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${palette.textPrimary} mt-1 leading-snug`}>
                              {pr.title}
                            </p>
                            {summary && (
                              <p className={`text-xs ${palette.textMuted} mt-2 leading-relaxed line-clamp-2`}>
                                {summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(container, document.body) : null;
}
