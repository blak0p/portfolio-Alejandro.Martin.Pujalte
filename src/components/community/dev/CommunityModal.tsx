// Dev-face community modal.
//
// Mirrors deployments/ProjectModal.tsx: focus trap, Esc close, backdrop close,
// marked-based rendering for the summary. Opens when both project and pr are
// non-null. When summary === null, the modal shows the literal Spanish string
// "no se pudo hacer el resumen" (no PR title fallback) per the spec.

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import type { CommunityProject, CommunityPR } from '../../../lib/community';

interface CommunityModalProps {
  project: CommunityProject | null;
  pr: CommunityPR | null;
  onClose: () => void;
}

marked.use({ gfm: true, breaks: true });

const NO_SUMMARY = 'no se pudo hacer el resumen';

export default function CommunityModal({ project, pr, onClose }: CommunityModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc to close
  useEffect(() => {
    if (!pr) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [pr, onClose]);

  // Focus trap: focus the dialog on open, keep Tab inside.
  useEffect(() => {
    if (!pr) return;
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
  }, [pr]);

  if (!pr || !project) return null;

  const summaryHtml = pr.summary
    ? (marked.parse(pr.summary) as string)
    : NO_SUMMARY;

  const portal = (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 pointer-events-none"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`PR #${pr.number} en ${project.name}`}
          className="bg-carbono-surface w-full sm:max-w-2xl font-mono border border-white/15 pointer-events-auto flex flex-col h-full sm:h-auto sm:max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-cobalt tracking-widest uppercase shrink-0">
                #{pr.number}
              </span>
              <span className="text-sm font-bold text-white tracking-widest uppercase truncate">
                {project.name}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-text-faint hover:text-white tracking-widest border border-white/15 px-2 py-1 hover:border-white/40 transition-colors duration-100 shrink-0 cursor-pointer"
            >
              [ESC]
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            <div>
              <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// PR</p>
              <p className="text-sm text-white leading-relaxed font-medium">{pr.title}</p>
            </div>

            <div>
              <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// RESUMEN</p>
              {pr.summary ? (
                <div
                  className="readme-content text-xs text-text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: summaryHtml }}
                />
              ) : (
                <p className="text-xs text-err/80 tracking-widest uppercase italic">
                  {NO_SUMMARY}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// FECHA</p>
              <p className="text-xs text-text-muted tracking-widest">
                {new Date(pr.mergedAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/15 px-5 py-3 shrink-0">
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cobalt tracking-widest hover:text-cobalt-light transition-colors"
            >
              → VER EN GITHUB
            </a>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(portal, document.body) : null;
}