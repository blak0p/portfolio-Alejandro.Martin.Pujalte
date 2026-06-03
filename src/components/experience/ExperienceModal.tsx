import React, { useEffect, useState } from 'react';
import type { Experience } from '../../types';

interface Props {
  exp: Experience | null;
  onClose: () => void;
}

type Tab = 'overview' | 'stack' | 'impact';

export default function ExperienceModal({ exp, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!exp) return;
    setTab('overview');
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [exp, onClose]);

  if (!exp) return null;

  const hasImpact = !!exp.impact;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="border border-white/15 bg-carbono-surface w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/15 px-5 py-4 shrink-0 gap-3">
          <div className="flex items-center gap-4 min-w-0">
            {exp.logoUrl && (
              <img
                src={exp.logoUrl}
                alt={exp.company}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 object-contain shrink-0 bg-carbono-mid p-1"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-white uppercase tracking-wide">{exp.company}</span>
                {exp.current && (
                  <span className="text-xs font-bold tracking-widest uppercase border border-cobalt/40 text-cobalt px-1.5 py-0.5 bg-cobalt/5 shrink-0">CURRENT</span>
                )}
              </div>
              <span className="text-xs text-cobalt tracking-widest uppercase">{exp.role}</span>
              <span className="block text-sm text-text-faint tracking-widest mt-0.5">{exp.period}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-text-faint hover:text-white tracking-widest border border-white/15 px-2 py-1 hover:border-white/40 transition-colors duration-100 shrink-0"
          >
            [ESC]
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/15 shrink-0">
          <button
            onClick={() => setTab('overview')}
            className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'overview' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}
          >
            OVERVIEW
          </button>
          <button
            onClick={() => setTab('stack')}
            className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'stack' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}
          >
            STACK
          </button>
          {hasImpact && (
            <button
              onClick={() => setTab('impact')}
              className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'impact' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}
            >
              IMPACT
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'overview' && (
            <div className="p-5 flex flex-col gap-5">
              <div>
                <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// Role</p>
                <p className="text-sm font-bold text-white uppercase tracking-widest">{exp.role}</p>
              </div>
              {exp.description && (
                <div>
                  <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// What I did</p>
                  <p className="text-xs text-text-muted leading-relaxed">{exp.description}</p>
                </div>
              )}
              {exp.url && (
                <div>
                  <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// Company</p>
                  <a
                    href={exp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cobalt hover:text-cobalt-light tracking-widest transition-colors"
                  >
                    → {exp.url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          )}

          {tab === 'stack' && (
            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-cobalt tracking-widest uppercase">// Technologies used</p>
              {exp.tech.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {exp.tech.map(t => (
                    <div key={t} className="border border-white/15 bg-carbono px-4 py-3">
                      <span className="text-sm font-bold text-white tracking-widest uppercase">{t}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-text-faint tracking-widest">NO_STACK_DEFINED</span>
              )}
            </div>
          )}

          {tab === 'impact' && hasImpact && (
            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-cobalt tracking-widest uppercase">// Impact & results</p>
              <blockquote className="border-l-2 border-cobalt pl-4 text-sm text-text-muted leading-relaxed">
                {exp.impact}
              </blockquote>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
