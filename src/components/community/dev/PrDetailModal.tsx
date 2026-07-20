// PR detail modal (per-PR).
//
// Shared by both faces (recruiter and dev). Opens when both `project` and
// `pr` are non-null. Shows the PR title, summary (or the literal "no se pudo
// hacer el resumen" when Gemini failed), merged date, and a link to the PR.
// Markdown in the summary is rendered with `marked`. Esc and backdrop close
// the modal; focus is trapped while open.
//
// Mirrors deployments/ProjectModal.tsx for the dev face palette. The
// recruiter face uses the warmer glassmorphic palette.

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import type { CommunityProject, CommunityPR } from '../../../lib/community';

interface PrDetailModalProps {
  project: CommunityProject | null;
  pr: CommunityPR | null;
  face: 'recruiter' | 'dev';
  onClose: () => void;
}

marked.use({ gfm: true, breaks: true });

const NO_SUMMARY = 'no se pudo hacer el resumen';

export default function PrDetailModal({ project, pr, face, onClose }: PrDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pr) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [pr, onClose]);

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
    : null;

  const isRecruiter = face === 'recruiter';
  const palette = isRecruiter
    ? {
        bg: 'bg-[#080c14]/95',
        border: 'border-white/10',
        textPrimary: 'text-white',
        textSecondary: 'text-white/60',
        textMuted: 'text-white/40',
        accent: 'text-recruiter-accent-light',
        divider: 'border-white/10',
        sectionLabel: 'text-recruiter-accent-light/70',
        font: 'font-sans',
        rounded: 'rounded-2xl',
      }
    : {
        bg: 'bg-carbono-surface',
        border: 'border-white/15',
        textPrimary: 'text-white',
        textSecondary: 'text-text-muted',
        textMuted: 'text-text-faint',
        accent: 'text-cobalt',
        divider: 'border-white/15',
        sectionLabel: 'text-cobalt',
        font: 'font-mono',
        rounded: '',
      };

  const portal = (
    <>
      <div
        className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center sm:p-4 pointer-events-none"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`PR #${pr.number} en ${project.name}`}
          className={`${palette.bg} ${palette.border} ${palette.font} ${palette.rounded} w-full sm:max-w-2xl border pointer-events-auto flex flex-col h-full sm:h-auto sm:max-h-[80vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b ${palette.divider} px-5 py-3 shrink-0 gap-3`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs ${palette.accent} ${isRecruiter ? '' : 'tracking-widest uppercase'} shrink-0`}>
                #{pr.number}
              </span>
              <span className={`text-sm font-bold ${palette.textPrimary} ${isRecruiter ? '' : 'tracking-widest uppercase'} truncate`}>
                {project.name}
              </span>
            </div>
            <button
              onClick={onClose}
              className={`text-xs ${palette.textMuted} hover:${palette.textPrimary} ${isRecruiter ? '' : 'tracking-widest'} border ${palette.border} px-2 py-1 hover:border-white/40 transition-colors duration-100 shrink-0 cursor-pointer`}
            >
              [ESC]
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            <div>
              <p className={`text-xs ${palette.sectionLabel} ${isRecruiter ? '' : 'tracking-widest uppercase'} mb-2`}>
                // PR
              </p>
              <p className={`text-sm ${palette.textPrimary} leading-relaxed font-medium`}>
                {pr.title}
              </p>
            </div>

            <div>
              <p className={`text-xs ${palette.sectionLabel} ${isRecruiter ? '' : 'tracking-widest uppercase'} mb-2`}>
                // RESUMEN
              </p>
              {summaryHtml ? (
                <div
                  className={`readme-content text-xs ${palette.textSecondary} leading-relaxed prose prose-invert max-w-none`}
                  dangerouslySetInnerHTML={{ __html: summaryHtml }}
                />
              ) : (
                <p className={`text-xs text-err/80 ${isRecruiter ? 'italic' : 'tracking-widest uppercase italic'}`}>
                  {NO_SUMMARY}
                </p>
              )}
            </div>

            <div>
              <p className={`text-xs ${palette.sectionLabel} ${isRecruiter ? '' : 'tracking-widest uppercase'} mb-2`}>
                // FECHA
              </p>
              <p className={`text-xs ${palette.textMuted} ${isRecruiter ? '' : 'tracking-widest'}`}>
                {new Date(pr.mergedAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className={`border-t ${palette.divider} px-5 py-3 shrink-0`}>
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${palette.accent} ${isRecruiter ? 'hover:underline' : 'tracking-widest hover:text-cobalt-light transition-colors'}`}
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
