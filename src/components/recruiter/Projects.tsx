import React, { useState, useEffect } from 'react';
import type { Project } from '../../types';
import ProjectModal from '../deployments/ProjectModal';
import { parseStoredProjects, sanitizeProjects } from '../../lib/projectStorage';

interface ProjectsProps {
  projects: Project[];
  syncWithStorage?: boolean;
}

export default function Projects({ projects: initialProjects, syncWithStorage = false }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>(sanitizeProjects(initialProjects));
  const [selected, setSelected] = useState<Project | null>(null);

  useEffect(() => {
    if (!syncWithStorage) {
      setProjects(sanitizeProjects(initialProjects));
      return;
    }

    const load = () => {
      const sanitized = parseStoredProjects(localStorage.getItem('portfolioProjects'), sanitizeProjects(initialProjects));
      setProjects(sanitized);
      localStorage.setItem('portfolioProjects', JSON.stringify(sanitized));
    };

    load();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'portfolioProjects' || e.key === 'lastDataUpdate') load();
    };
    const onRefresh = () => load();

    window.addEventListener('storage', onStorage);
    window.addEventListener('portfolioProjectsRefreshed', onRefresh);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('portfolioProjectsRefreshed', onRefresh);
    };
  }, [initialProjects, syncWithStorage]);
  const [showListModal, setShowListModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'private'>('all');

  const displayedProjects = projects.slice(0, 5);

  const projectsGrid = React.useMemo(() => {
    if (projects.length === 0) {
      return <p className="text-sm text-white/40">Sin proyectos para mostrar.</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-500">
        {displayedProjects.map((project) => {
          const isPrivate = project.isPrivate ?? false;
          const repoUrl = typeof project.specs?.repo === 'string' ? project.specs.repo : undefined;
          const displayDesc = project.description || (typeof project.specs?.description === 'string' ? project.specs.description : '');
          const stack = Array.isArray(project.stack) ? project.stack : [];

          return (
            <article
              key={project.id || project.name}
              onClick={() => setSelected(project)}
              className="group relative bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:border-recruiter-accent/50 hover:shadow-[0_12px_36px_rgba(0,102,255,0.15)] cursor-pointer"
            >
              {isPrivate && (
                <div className="absolute inset-0 redacted-stripes pointer-events-none z-10 opacity-30" />
              )}

              {project.photo ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-carbono-mid/80">
                  <img
                    src={project.photo}
                    alt={project.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-transparent to-transparent pointer-events-none"></div>
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-carbono-mid/80 flex items-center justify-center border-b border-white/5">
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
  }, [displayedProjects, projects.length]);

  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(project.stack) ? project.stack : []).some((tech) =>
          tech.toLowerCase().includes(searchQuery.toLowerCase())
        );

      if (filterTab === 'public') return matchesSearch && !project.isPrivate;
      if (filterTab === 'private') return matchesSearch && project.isPrivate;
      return matchesSearch;
    });
  }, [projects, searchQuery, filterTab]);

  return (
    <>
      <section className="recruiter-section" id="projects">
        <div className="recruiter-container">
          <h2 className="recruiter-section-title">Proyectos</h2>
          
          {/* Glassmorphic outer container nesting all project cards */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.01] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-6">
            {projectsGrid}

            {projects.length > 5 && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => setShowListModal(true)}
                  className="px-6 py-2.5 bg-white/[0.03] border border-white/10 hover:border-recruiter-accent/50 hover:bg-white/[0.08] hover:text-recruiter-accent-light rounded-xl text-sm font-semibold text-white/80 transition-all duration-300 shadow-md cursor-pointer hover:shadow-[0_0_15px_rgba(0,102,255,0.15)]"
                >
                  Ver más
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full project list modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080c14]/85 backdrop-blur-md">
          <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 pr-16">
              <div>
                <h3 className="text-xl font-bold text-white">Todos los Proyectos</h3>
                <p className="text-xs text-white/50 mt-1">Explora la lista completa de desarrollos e integraciones</p>
              </div>
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Buscar tecnología, nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-recruiter-accent/50 w-full sm:w-60"
                />
                <div className="flex bg-white/[0.04] p-1 border border-white/5 rounded-xl text-[11px] shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${filterTab === 'all' ? 'bg-recruiter-accent text-white font-medium' : 'text-white/60 hover:text-white'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterTab('public')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${filterTab === 'public' ? 'bg-recruiter-accent text-white font-medium' : 'text-white/60 hover:text-white'}`}
                  >
                    Públicos
                  </button>
                  <button
                    onClick={() => setFilterTab('private')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${filterTab === 'private' ? 'bg-recruiter-accent text-white font-medium' : 'text-white/60 hover:text-white'}`}
                  >
                    Privados (NDA)
                  </button>
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={() => setShowListModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/[0.04] border border-white/5 hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Grid container with smooth scroll */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-white/40">No se encontraron proyectos con esos criterios.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProjects.map((project) => {
                    const isPrivate = project.isPrivate ?? false;
                    const repoUrl = typeof project.specs?.repo === 'string' ? project.specs.repo : undefined;
                    const displayDesc = project.description || (typeof project.specs?.description === 'string' ? project.specs.description : '');
                    const stack = Array.isArray(project.stack) ? project.stack : [];

                    return (
                      <article
                        key={project.id || project.name}
                        onClick={() => {
                          setSelected(project);
                        }}
                        className="group relative bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:border-recruiter-accent/50 hover:shadow-[0_12px_36px_rgba(0,102,255,0.15)] cursor-pointer"
                      >
                        {isPrivate && (
                          <div className="absolute inset-0 redacted-stripes pointer-events-none z-10 opacity-30" />
                        )}

                        {project.photo ? (
                          <div className="relative aspect-[16/9] overflow-hidden bg-carbono-mid/80">
                            <img
                              src={project.photo}
                              alt={project.name}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-transparent to-transparent pointer-events-none"></div>
                          </div>
                        ) : (
                          <div className="relative aspect-[16/9] bg-carbono-mid/80 flex items-center justify-center border-b border-white/5">
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
              )}
            </div>
          </div>
        </div>
      )}

      <ProjectModal project={selected} onClose={() => setSelected(null)} theme="recruiter" />
    </>
  );
}
