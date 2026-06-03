import React, { useEffect, useState } from 'react';
import type { Experience } from '../../types';
import ExperienceModal from './ExperienceModal';

export default function ExperienceSection() {
  const [items, setItems]       = useState<Experience[]>([]);
  const [selected, setSelected] = useState<Experience | null>(null);

  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem('portfolioExperience');
      if (stored) { setItems(JSON.parse(stored)); return; }
      fetch('/data/experience.json')
        .then(r => r.ok ? r.json() : [])
        .then((data: Experience[]) => {
          if (data.length) {
            setItems(data);
            localStorage.setItem('portfolioExperience', JSON.stringify(data));
          }
        })
        .catch(() => {});
    };
    load();
    const handler = (e: StorageEvent) => { if (e.key === 'portfolioExperience') load(); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!items.length) return (
    <div className="border border-white/15 bg-carbono-surface p-8 text-center">
      <span className="text-sm text-text-faint tracking-widest">NO_EXPERIENCE_REGISTERED</span>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(exp => (
          <button
            key={exp.id}
            onClick={() => setSelected(exp)}
            className="text-left border border-white/15 bg-carbono-surface p-4 flex flex-col gap-2.5 hover:border-cobalt/50 hover:bg-carbono-mid transition-colors duration-150 group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {exp.logoUrl && (
                  <img
                    src={exp.logoUrl}
                    alt={exp.company}
                    loading="lazy"
                    decoding="async"
                    className="w-7 h-7 object-contain shrink-0 bg-carbono-mid p-0.5"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white uppercase tracking-widest leading-snug">{exp.company}</span>
                    {exp.current && (
                      <span className="text-xs font-bold tracking-widest uppercase border border-cobalt/40 text-cobalt px-1 py-0.5 bg-cobalt/5 shrink-0">NOW</span>
                    )}
                  </div>
                  <span className="text-xs text-cobalt tracking-widest uppercase block">{exp.role}</span>
                </div>
              </div>
              <span className="text-xs text-text-faint tracking-widest shrink-0 font-mono">{exp.period}</span>
            </div>

            {exp.description && (
              <p className="text-sm text-text-muted leading-relaxed line-clamp-2">{exp.description}</p>
            )}

            {exp.tech.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {exp.tech.slice(0, 4).map(t => (
                  <span key={t} className="text-xs border border-white/15 px-1.5 py-0.5 text-white/70 uppercase tracking-widest">{t}</span>
                ))}
                {exp.tech.length > 4 && (
                  <span className="text-xs text-text-faint px-1.5 py-0.5">+{exp.tech.length - 4}</span>
                )}
              </div>
            )}

            <span className="text-xs text-cobalt/0 group-hover:text-cobalt/60 tracking-widest uppercase transition-colors duration-150 mt-auto">→ VIEW DETAILS</span>
          </button>
        ))}
      </div>

      <ExperienceModal exp={selected} onClose={() => setSelected(null)} />
    </>
  );
}
