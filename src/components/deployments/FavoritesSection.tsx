import React, { useState, useEffect } from 'react';
import type { Project } from '../../types';
import { parseStoredProjects } from '../../lib/projectStorage';
import ProjectCard from './ProjectCard';
import ProjectModal from './ProjectModal';

export default function FavoritesSection() {
  const [favorites, setFavorites] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);

  function loadFavorites() {
    try {
      const all = parseStoredProjects(localStorage.getItem('portfolioProjects'));
      const pinned = all
        .filter(p => p.isFavorite)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setFavorites(pinned);
    } catch {}
  }

  useEffect(() => {
    loadFavorites();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'portfolioProjects' || e.key === 'lastDataUpdate') loadFavorites();
    };
    const onRefresh = () => loadFavorites();
    window.addEventListener('storage', onStorage);
    window.addEventListener('portfolioProjectsRefreshed', onRefresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('portfolioProjectsRefreshed', onRefresh);
    };
  }, []);

  if (favorites.length === 0) return null;

  return (
    <>
      <div className="mb-3">
        <div className="flex items-baseline gap-3 pb-2 border-b border-bronze/30 mb-3">
          <h3 className="text-xs font-bold text-bronze tracking-widest uppercase">
            PINNED_DEPLOYMENTS
          </h3>
          <span className="text-xs text-bronze/70 tracking-widest">[{favorites.length}]</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {favorites.map(p => (
            <ProjectCard key={p.id} project={p} onClick={setSelected} />
          ))}
        </div>
      </div>
      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </>
  );
}
