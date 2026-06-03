import React, { useState, useEffect } from 'react';
import type { Project } from '../../types';
import { parseStoredProjects, sanitizeProjects } from '../../lib/projectStorage';
import { sortProjects } from '../../lib/projectRanking';
import ProjectCard from './ProjectCard';
import ProjectModal from './ProjectModal';
import AllProjectsModal from './AllProjectsModal';

interface ProjectGridProps {
  projects?: Project[];
  syncWithStorage?: boolean;
}

const INITIAL_LIMIT = 5;

export default function ProjectGrid({ projects: initialProjects = [], syncWithStorage = false }: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>(sanitizeProjects(initialProjects));
  const [selected, setSelected] = useState<Project | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onOpenFromTerminal = (e: any) => {
      if (e.detail?.project) setSelected(e.detail.project);
    };

    window.addEventListener('portfolioOpenProject', onOpenFromTerminal);

    return () => {
      window.removeEventListener('portfolioOpenProject', onOpenFromTerminal);
    };
  }, []);

  useEffect(() => {
    setProjects(sanitizeProjects(initialProjects));
  }, [initialProjects]);

  useEffect(() => {
    if (!syncWithStorage) return;

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

  const sorted = sortProjects(projects);

  const visible = expanded ? sorted : sorted.slice(0, INITIAL_LIMIT);
  const remaining = sorted.length - INITIAL_LIMIT;
  const singleProject = visible.length === 1;

  return (
    <>
      <div className="@container flex flex-col gap-3 island-load">
        <div className={`${singleProject ? 'max-w-[1600px]' : ''} grid grid-cols-1 @xs:grid-cols-2 @md:grid-cols-5 gap-1.5`}>
          {visible.map(p => (
            <ProjectCard key={p.id} project={p} onClick={setSelected} />
          ))}
          {projects.length === 0 && (
            <div className="col-span-5 py-8 text-center text-xs text-text-faint tracking-widest">
              NO_PROJECTS
            </div>
          )}
        </div>

        {remaining > 0 && !expanded && (
          <button
            onClick={() => setShowAll(true)}
            className="self-end text-sm text-cobalt hover:text-white tracking-widest uppercase border border-cobalt/40 hover:border-cobalt hover:bg-cobalt/10 px-4 py-1.5 transition-colors duration-150 cursor-pointer"
          >
            [+] EXPAND_MODULES ({remaining})
          </button>
        )}

        {expanded && remaining > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="self-end text-sm text-text-faint hover:text-cobalt tracking-widest uppercase border border-white/15 hover:border-cobalt/40 px-4 py-1.5 transition-colors duration-100 cursor-pointer"
          >
            ALL_PROJECTS ({projects.length}) →
          </button>
        )}
      </div>

      {showAll && (
        <AllProjectsModal projects={projects} onClose={() => setShowAll(false)} />
      )}
      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </>
  );
}
