import React, { useEffect, useState } from 'react';
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const statusStyle: Record<string, string> = {
  EN_PROGRESO: 'text-warn border-warn/50 bg-warn/10',
  IN_PROGRESS: 'text-warn border-warn/50 bg-warn/10',
  COMPLETED:   'text-cobalt border-cobalt/50 bg-cobalt/10',
  PAUSADO:     'text-white/70 border-white/30 bg-white/5',
  PAUSED:      'text-white/70 border-white/30 bg-white/5',
  ARCHIVED:    'text-err/60 border-err/30 bg-err/5',
};

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [project.id, project.photo]);

  const stars     = Number(project.specs?.stars ?? 0);
  const status    = project.specs?.status as string | undefined;

  return (
    <div data-project-id={project.id} className="@container">
      <div
        className={`relative aspect-square cursor-pointer group overflow-hidden border transition-all duration-150
          border-white/15 hover:border-white/40`}
        onClick={() => {
          onClick(project);
          window.dispatchEvent(new CustomEvent('portfolioTerminalEvent', {
            detail: { type: 'MODULE_ACCESS', projectName: project.name }
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
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105`}
          />
        ) : (
          <div className="absolute inset-0 bg-carbono-mid flex items-center justify-center">
            <span className="text-xs text-text-faint tracking-widest">SIN_PREVIEW</span>
          </div>
        )}

        {project.isPrivate && (
          <div className="absolute inset-0 redacted-stripes pointer-events-none z-10 opacity-30" />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />

        <div className="absolute top-2 left-2 hidden @[180px]:flex gap-1.5">
          {project.isPrivate && (
            <span className="text-[10px] font-bold tracking-widest text-err border border-err/50 bg-err/10 px-1.5 py-1 leading-none backdrop-blur-sm">
              NDA
            </span>
          )}
          {status && statusStyle[status] && (
            <span className={`text-xs font-bold tracking-widest uppercase border px-2 py-1 leading-none backdrop-blur-sm ${statusStyle[status]}`}>
              {status.replace('_', ' ')}
            </span>
          )}
          {project.isFavorite && (
            <span className={`text-xs font-bold tracking-widest uppercase border px-2 py-1 leading-none text-bronze border-bronze/50 bg-bronze/20 backdrop-blur-sm`}>
              DESTACADO
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
