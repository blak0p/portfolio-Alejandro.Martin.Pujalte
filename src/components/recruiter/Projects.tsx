import React, { useState } from 'react';
import type { Project } from '../../types';
import ProjectModal from '../deployments/ProjectModal';

interface ProjectsProps {
  projects: Project[];
}

export default function Projects({ projects }: ProjectsProps) {
  const [selected, setSelected] = useState<Project | null>(null);

  const projectsGrid = React.useMemo(() => {
    if (projects.length === 0) {
      return <p className="text-sm text-white/40">Sin proyectos para mostrar.</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((project) => {
          const isPrivate = project.isPrivate ?? false;
          const repoUrl = typeof project.specs?.repo === 'string' ? project.specs.repo : undefined;
          const displayDesc = project.description || (typeof project.specs?.description === 'string' ? project.specs.description : '');
          const stack = Array.isArray(project.stack) ? project.stack : [];

          return (
            <article
              key={project.id || project.name}
              onClick={() => setSelected(project)}
              className="group relative bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:border-recruiter-accent/40 hover:shadow-[0_0_24px_rgba(202,138,4,0.1)] hover:scale-[1.015] cursor-pointer"
            >
              {isPrivate && (
                <div className="absolute inset-0 redacted-stripes pointer-events-none z-10 opacity-30" />
              )}

              {project.photo ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-carbono-mid">
                  <img
                    src={project.photo}
                    alt={project.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent pointer-events-none"></div>
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-carbono-mid flex items-center justify-center border-b border-white/5">
                  <span className="text-xs text-white/40 tracking-widest">NDA / CLASIFICADO</span>
                </div>
              )}

              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white leading-tight">
                      {project.name}
                    </h3>
                    {isPrivate && (
                      <span className="text-[10px] font-bold tracking-widest text-err border border-err/30 px-1.5 py-0.5 rounded-sm bg-err/5">
                        NDA
                      </span>
                    )}
                  </div>
                  {repoUrl && !isPrivate && (
                    <a
                      href={repoUrl.startsWith('http') ? repoUrl : `https://${repoUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-recruiter-accent-light hover:text-recruiter-accent transition-colors shrink-0 mt-1"
                      aria-label={`Repositorio de ${project.name}`}
                    >
                      Repo →
                    </a>
                  )}
                </div>

                {displayDesc && (
                  <p className="text-sm text-white/60 leading-relaxed">
                    {displayDesc}
                  </p>
                )}

                {stack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {stack.map((tech) => (
                      <span key={tech} className="text-xs bg-white/[0.06] text-white/50 px-2.5 py-1 rounded-md">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [projects]);

  return (
    <>
      <section className="recruiter-section" id="projects">
        <div className="recruiter-container">
          <h2 className="recruiter-section-title">Proyectos</h2>
          {projectsGrid}
        </div>
      </section>
      <ProjectModal project={selected} onClose={() => setSelected(null)} theme="recruiter" />
    </>
  );
}
