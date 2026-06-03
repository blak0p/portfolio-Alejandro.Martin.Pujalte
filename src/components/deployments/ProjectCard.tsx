import React, { useEffect, useState } from 'react';
import type { Project, SiteSettings } from '../../types';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const DEFAULT_SETTINGS: SiteSettings = { availabilityValue: 99.9, dustThresholdDays: 60, starsForGold: 5 };

function loadSettings(): SiteSettings {
  try {
    const s = localStorage.getItem('portfolioSettings');
    if (s) return { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function getDustLabel(pushedAt: string | undefined, thresholdDays: number): string | null {
  if (!pushedAt) return null;
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000;
  if (days < thresholdDays) return null;
  if (days < thresholdDays * 2) return 'STABLE';
  if (days < thresholdDays * 3) return 'LEGACY';
  return 'ARCHIVED';
}

function getEntropyStyle(pushedAt: string | undefined, thresholdDays: number): React.CSSProperties {
  if (!pushedAt) return {};
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000;
  if (days < thresholdDays) return {};
  if (days < thresholdDays * 2) return { filter: 'brightness(0.82) saturate(0.45)' };
  if (days < thresholdDays * 3) return { filter: 'brightness(0.65) saturate(0.15) blur(0.5px)' };
  return { filter: 'brightness(0.5) saturate(0) blur(1px)' };
}

const statusStyle: Record<string, string> = {
  IN_PROGRESS: 'text-warn border-warn/50 bg-warn/10',
  COMPLETED:   'text-cobalt border-cobalt/50 bg-cobalt/10',
  PAUSED:      'text-white/70 border-white/30 bg-white/5',
  ARCHIVED:    'text-err/60 border-err/30 bg-err/5',
};

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    const onStorage = () => setSettings(loadSettings());
    window.addEventListener('storage', onStorage);
    window.addEventListener('portfolioSettingsChanged', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('portfolioSettingsChanged', onStorage);
    };
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [project.id, project.photo]);

  const stars     = Number(project.specs?.stars ?? 0);
  const status    = project.specs?.status as string | undefined;
  const isGold    = !!(project.isHighlighted || stars >= settings.starsForGold);
  const dustLabel = isGold ? null : getDustLabel(project.pushedAt, settings.dustThresholdDays);
  const entropyStyle = isGold ? {} : getEntropyStyle(project.pushedAt, settings.dustThresholdDays);

  return (
    <div data-project-id={project.id} className="@container">
      <div
        className={`relative aspect-square cursor-pointer group overflow-hidden border transition-all duration-150
          ${isGold
            ? 'border-bronze crt-flicker'
            : 'border-white/15 hover:border-white/40'
          }`}
        style={{
          boxShadow: isGold ? '0 0 24px rgba(184,115,51,0.2)' : undefined,
          ...entropyStyle,
        }}
        onClick={() => {
          onClick(project);
          const dustThresholdDays = settings.dustThresholdDays || 60;
          const daysSinceUpdate = project.pushedAt ? (Date.now() - new Date(project.pushedAt).getTime()) / 86_400_000 : 0;
          const isDusty = daysSinceUpdate > dustThresholdDays;

          window.dispatchEvent(new CustomEvent('portfolioTerminalEvent', {
            detail: { 
              type: 'MODULE_ACCESS', 
              projectName: project.name, 
              isGold,
              isDusty
            }
          }));
        }}
      >
        {project.photo && !imageError ? (
          <img
            src={project.photo}
            alt={project.name}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105
              ${project.isPrivate ? 'opacity-40' : ''}`}
          />
        ) : (
          <div className="absolute inset-0 bg-carbono-mid flex items-center justify-center">
            <span className="text-xs text-text-faint tracking-widest">NO_PREVIEW</span>
          </div>
        )}

        {isGold && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(135deg, rgba(184,115,51,0.12) 0%, transparent 60%, rgba(184,115,51,0.06) 100%)',
          }} />
        )}

        {project.isPrivate && (
          <div className="absolute inset-0 redacted-stripes flex flex-col items-center justify-center gap-1.5">
            <div className="border-2 border-err/70 px-2.5 py-0.5 bg-carbono/80" style={{ transform: 'rotate(-6deg)' }}>
              <span className="text-err text-xs font-bold tracking-[0.3em] uppercase">CLASSIFIED</span>
            </div>
            <span className="text-xs text-white/70 tracking-widest">Private · NDA</span>
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />

        <div className="absolute top-2 left-2 hidden @[180px]:flex gap-1.5">
          {status && statusStyle[status] && (
            <span className={`text-xs font-bold tracking-widest uppercase border px-2 py-1 leading-none backdrop-blur-sm ${statusStyle[status]}`}>
              {status.replace('_', ' ')}
            </span>
          )}
          {project.isFavorite && (
            <span className={`text-xs font-bold tracking-widest uppercase border px-2 py-1 leading-none text-bronze border-bronze/50 bg-bronze/20 backdrop-blur-sm`}>
              PINNED
            </span>
          )}
          {dustLabel && (
            <span className="text-xs font-bold tracking-widest uppercase border px-2 py-1 leading-none text-white/70 border-white/15 bg-black/50 backdrop-blur-sm">
              {dustLabel}
            </span>
          )}
        </div>

        {stars > 0 && (
          <div className="absolute top-1.5 right-1.5 hidden @[150px]:flex items-center gap-1 bg-black/60 border border-warn/40 px-2 py-1 backdrop-blur-sm">
            <span className="text-sm text-warn">★</span>
            <span className="text-sm text-white font-mono font-bold">{stars}</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
          <p className="text-base font-bold tracking-widest uppercase leading-tight text-white drop-shadow-md truncate">
            {project.name}
          </p>
          <div className="hidden @[250px]:flex flex-wrap gap-1.5 mt-2">
            {[...new Set(project.stack)].slice(0, 3).map(tech => (
              <span key={tech} className="text-xs border px-2 py-1 tracking-widest uppercase backdrop-blur-sm border-white/15 text-white/70 bg-black/40">
                {tech}
              </span>
            ))}
            {project.stack.length > 3 && (
              <span className="text-xs text-white/70 py-1">+{project.stack.length - 3}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
