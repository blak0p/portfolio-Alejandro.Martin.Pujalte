import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import type { Project } from '../../types';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  theme?: 'dev' | 'recruiter';
}

marked.use({ gfm: true, breaks: true });

async function fetchReadme(repoSlug: string): Promise<string> {
  const res = await fetch('/api/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getRepoContent', repoSlug })
  });
  if (!res.ok) throw new Error(`README not found (${res.status})`);
  const data = await res.json();
  return data.content;
}

async function fetchRepoFile(repoSlug: string, path: string): Promise<{ content: string; isMd: boolean }> {
  const res = await fetch('/api/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getRepoContent', repoSlug, path })
  });
  if (!res.ok) throw new Error(`File not found: ${path} (${res.status})`);
  const data = await res.json();
  const raw = data.content;
  return { content: raw, isMd: /\.(md|mdx|markdown)$/i.test(path) };
}

type Tab = 'overview' | 'readme' | 'stack' | 'specs' | 'media';

const VERSION_MAP: Record<string, string> = {
  GO: 'v1.23+', TYPESCRIPT: 'v5.3+', JAVASCRIPT: 'ES2024', PYTHON: 'v3.12+',
  RUST: 'v1.78+', REACT: 'v19+', ASTRO: 'v5+', DOCKER: 'v26+',
  PODMAN: 'v5+', NODE: 'v22+', 'NODE.JS': 'v22+', SHELL: 'bash 5+',
  BASH: 'bash 5+', TAILWIND: 'v4+', CSS: 'CSS3', SWIFT: 'v5.9+',
  KOTLIN: 'v1.9+', JAVA: 'v21+', 'C#': 'v12+', 'C++': 'v20+',
};

const STATUS_STYLE: Record<string, string> = {
  EN_PROGRESO: 'text-warn border-warn/40 bg-warn/5',
  IN_PROGRESS: 'text-warn border-warn/40 bg-warn/5',
  COMPLETED:   'text-cobalt border-cobalt/40 bg-cobalt/5',
  PAUSADO:     'text-white/70 border-white/30 bg-white/[0.06]',
  PAUSED:      'text-white/70 border-white/30 bg-white/[0.06]',
  ARCHIVED:    'text-err/60 border-err/30 bg-err/5',
};

function VideoEmbed({ url }: { url: string }) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) return (
    <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
  );
  if (vimeoMatch) return (
    <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full aspect-video" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
  );
  return <video src={url} controls preload="none" className="w-full aspect-video bg-carbono" />;
}

export default function ProjectModal({ project, onClose, theme = 'dev' }: ProjectModalProps) {
  const [tab, setTab]       = useState<Tab>('overview');
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  // Inline file navigation: stack of { path, content, isMd }
  const [fileStack, setFileStack] = useState<{ path: string; content: string; isMd: boolean }[]>([]);
  const currentFile = fileStack[fileStack.length - 1];
  const readmeBodyRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImageFailed(false);
    if (!project) { setTab('overview'); setReadme(null); setFileStack([]); return; }
    const repoSlug = project.specs?.repoSlug as string | undefined;
    if (!repoSlug || project.isPrivate) { setTab('overview'); return; }
    setTab('overview');
    setReadme(null);
    setError(null);
    setFileStack([]);
    setLoading(true);
    fetchReadme(repoSlug)
      .then(md => setReadme(md))
      .catch(e => { setError(e.message); setTab('specs'); })
      .finally(() => setLoading(false));
  }, [project?.id]);

  // Intercept clicks on relative links inside readme-content
  useEffect(() => {
    const container = readmeBodyRef.current;
    if (!container || !project) return;
    const repoSlug = project.specs?.repoSlug as string | undefined;
    if (!repoSlug) return;

    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      // Match links we constructed pointing to GitHub blob
      const match = href.match(/github\.com\/[^/]+\/[^/]+\/blob\/main\/(.+)$/);
      if (!match) return;
      e.preventDefault();
      const filePath = decodeURIComponent(match[1]);
      setLoading(true);
      fetchRepoFile(repoSlug, filePath)
        .then(result => setFileStack(prev => [...prev, { path: filePath, ...result }]))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [readme, fileStack.length, project]);

  useEffect(() => {
    if (!project) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [project, onClose]);

  useEffect(() => {
    if (!loading && (readme || currentFile)) {
      const timer = setTimeout(() => {
        const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (combo) {
          combo.dispatchEvent(new Event('change'));
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, tab, readme, fileStack.length]);

  if (!project) return null;

  const hasRepo    = !!(project.specs?.repoSlug);
  const hasVideo   = !!(project.specs?.video);
  const status     = project.specs?.status as string | undefined;
  const repoSlug   = project.specs?.repoSlug as string | undefined;
  const repoBase   = repoSlug ? `https://github.com/${repoSlug}/blob/main/` : '';
  const repoRaw    = project.specs?.repo as string | undefined;
  const repoUrl    = repoRaw ? (repoRaw.startsWith('http') ? repoRaw : `https://${repoRaw}`) : undefined;

  function renderMarkdown(md: string): string {
    return (marked.parse(md) as string)
      .replace(/href="(?!https?:\/\/|#|mailto:)([^"]+)"/g, (_, p) =>
        `href="${repoBase}${p.replace(/^\.\//, '')}"`)
      .replace(/<a(\s)/g, '<a target="_blank" rel="noopener noreferrer"$1')
      .replace(/<img(\s)/g, '<img loading="lazy" decoding="async"$1');
  }

  // Current file being shown: either a file from the stack or the root README (already declared at the top)
  const displayHtml = currentFile
    ? currentFile.isMd
      ? renderMarkdown(currentFile.content)
      : `<pre class="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">${currentFile.content.replace(/</g, '&lt;')}</pre>`
    : readme
      ? renderMarkdown(readme)
      : '';
  const specsEntries = Object.entries(project.specs || {}).filter(([k]) => !['repoSlug', 'video', 'status'].includes(k));

  const isRecruiter = theme === 'recruiter';
  const getTabClass = (t: Tab) => {
    const active = tab === t;
    if (isRecruiter) {
      return `px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
        active
          ? 'border-recruiter-accent text-recruiter-accent-light'
          : 'border-transparent text-white/60 hover:text-white'
      }`;
    }
    return `px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${
      active
        ? 'border-cobalt text-white'
        : 'border-transparent text-text-faint hover:text-white'
    }`;
  };

  const labelClass = isRecruiter 
    ? 'text-xs text-recruiter-accent-light uppercase font-bold tracking-wider mb-2' 
    : 'text-xs text-cobalt tracking-widest uppercase mb-3';

  const showPhoto = !!(project.photo && !imageFailed);
  const showNdaPlaceholder = !!(project.isPrivate && (!project.photo || imageFailed));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal container — z-[9999] to sit above backdrop */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
        onClick={onClose}
      >
        <div
          className={`bg-carbono-surface w-full max-w-3xl h-[88vh] flex flex-col pointer-events-auto ${
            isRecruiter 
              ? 'font-sans rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.85)]' 
              : 'font-mono border border-white/15'
          }`}
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-lg font-bold text-white uppercase tracking-wider truncate">{project.name}</span>
          </div>
          <button
            onClick={onClose}
            className={isRecruiter
              ? "text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-full px-3.5 py-1.5 transition-all shrink-0 font-medium cursor-pointer"
              : "text-xs text-text-faint hover:text-white tracking-widest border border-white/15 px-2 py-1 hover:border-white/40 transition-colors duration-100 shrink-0 cursor-pointer"
            }
          >
            {isRecruiter ? "Cerrar" : "[ESC]"}
          </button>
        </div>

        {/* Tabs */}
        {!isRecruiter && (
          <div className="flex border-b border-white/15 shrink-0 flex-wrap">
            <button onClick={() => setTab('overview')} className={getTabClass('overview')}>VISIÓN GENERAL</button>
            {hasRepo && !project.isPrivate && (
              <button onClick={() => setTab('readme')} className={getTabClass('readme')}>README</button>
            )}
            <button onClick={() => setTab('stack')} className={getTabClass('stack')}>STACK</button>
            <button onClick={() => setTab('specs')} className={getTabClass('specs')}>ESPECIFICACIONES</button>
            {hasVideo && (
              <button onClick={() => setTab('media')} className={getTabClass('media')}>▶ MULTIMEDIA</button>
            )}
          </div>
        )}

        {/* Body */}
        {isRecruiter ? (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] h-full" ref={readmeBodyRef}>
            {/* Left Column (col-1) */}
            <div className="overflow-y-auto px-5 py-6 flex flex-col gap-6 border-r border-white/10 bg-white/[0.01]">
              {/* Image/Photo */}
              {showPhoto && (
                <img 
                  src={project.photo} 
                  alt={project.name}
                  onError={() => setImageFailed(true)}
                  className="w-full aspect-video md:aspect-square object-cover rounded-xl border border-white/10 shadow-md"
                />
              )}
              {showNdaPlaceholder && (
                <div className="redacted-stripes w-full aspect-video md:aspect-square flex flex-col items-center justify-center border border-white/10 rounded-xl bg-black/40 py-8 px-4 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-amber-500 mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span className="text-amber-500 font-bold tracking-wider text-xs uppercase">PROYECTO BAJO NDA</span>
                </div>
              )}
              {!showPhoto && !showNdaPlaceholder && (
                <div className="w-full aspect-video md:aspect-square flex flex-col items-center justify-center border border-white/10 rounded-xl bg-white/[0.02] py-8">
                  <span className="text-xs text-white/40 tracking-wider font-semibold">SIN IMAGEN</span>
                </div>
              )}

              {/* Status Pill */}
              {status && STATUS_STYLE[status] && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-white/40 uppercase font-bold tracking-wider">Estado</span>
                  <span className={`self-start text-xs font-bold tracking-widest uppercase border px-3 py-1 ${STATUS_STYLE[status]} rounded-md`}>
                    {status.replace('_', ' ')}
                  </span>
                </div>
              )}

              {/* Tech Tags */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-white/40 uppercase font-bold tracking-wider">Tecnologías</span>
                <div className="flex flex-wrap gap-1.5">
                  {project.stack.map(tech => (
                    <span key={tech} className="text-xs bg-white/[0.03] border border-white/10 text-white/80 px-2.5 py-1 rounded-lg font-medium">
                      {tech}
                    </span>
                  ))}
                  {project.stack.length === 0 && (
                    <span className="text-xs text-white/40">Sin stack definido</span>
                  )}
                </div>
              </div>

              {/* Repository Button / Badge */}
              <div className="flex flex-col gap-3 mt-2">
                {!project.isPrivate ? (
                  repoUrl ? (
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 border border-recruiter-accent/40 bg-recruiter-accent/10 hover:bg-recruiter-accent/25 text-recruiter-accent-light text-sm font-semibold rounded-xl transition-all duration-200 shadow-[0_0_12px_rgba(202,138,4,0.05)] text-center cursor-pointer"
                    >
                      Ver Repositorio
                    </a>
                  ) : null
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold uppercase rounded-xl tracking-wider text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    REPOSITORIO PRIVADO (NDA)
                  </div>
                )}

                {/* Demo Button */}
                {project.specs?.demo && (
                  <a
                    href={String(project.specs.demo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-recruiter-accent hover:bg-recruiter-accent-light text-carbono font-bold rounded-xl transition-all duration-200 shadow-[0_4px_20px_rgba(202,138,4,0.25)] hover:shadow-[0_4px_24px_rgba(202,138,4,0.4)] text-center cursor-pointer"
                  >
                    Visitar Sitio Web →
                  </a>
                )}
              </div>
            </div>

            {/* Right Column (col-2) */}
            <div className="overflow-y-auto px-6 py-6 flex flex-col gap-6">
              {/* Title */}
              <h2 className="text-2xl font-bold text-white tracking-wide">{project.name}</h2>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs text-recruiter-accent-light uppercase font-bold tracking-wider">Descripción</h3>
                <p className="text-sm text-white leading-relaxed font-medium">
                  {project.description || 'No hay descripción disponible.'}
                </p>
              </div>

              {/* Business Impact */}
              {project.businessImpact && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs text-recruiter-accent-light uppercase font-bold tracking-wider">Impacto de Negocio</h3>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    {project.businessImpact}
                  </p>
                </div>
              )}

              {/* Dynamic README */}
              {hasRepo && !project.isPrivate && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs text-recruiter-accent-light uppercase font-bold tracking-wider">Documentación del Proyecto (README)</h3>
                  
                  {/* Breadcrumb for inline file navigation inside recruiter view */}
                  {(fileStack.length > 0) && (
                    <div className="flex items-center gap-1 pt-1 pb-2 text-xs tracking-wider flex-wrap border-b border-white/5 mb-4">
                      <button
                        onClick={() => setFileStack([])}
                        className="text-recruiter-accent-light hover:text-recruiter-accent transition-colors font-semibold"
                      >
                        README
                      </button>
                      {fileStack.map((f, i) => (
                        <React.Fragment key={f.path}>
                          <span className="text-white/20">›</span>
                          {i < fileStack.length - 1 ? (
                            <button
                              onClick={() => setFileStack(prev => prev.slice(0, i + 1))}
                              className="text-recruiter-accent-light hover:text-recruiter-accent transition-colors font-semibold"
                            >
                              {f.path.split('/').pop()}
                            </button>
                          ) : (
                            <span className="text-white/60">{f.path.split('/').pop()}</span>
                          )}
                        </React.Fragment>
                      ))}
                      <button
                        onClick={() => setFileStack(prev => prev.slice(0, -1))}
                        className="ml-auto text-white/40 hover:text-white transition-colors"
                      >
                        ← volver
                      </button>
                    </div>
                  )}

                  {loading && (
                    <div className="flex items-center justify-center h-20 text-xs text-white/40 tracking-wider animate-pulse">
                      Cargando README...
                    </div>
                  )}
                  {!loading && (readme || currentFile) && (
                    <div
                      className="readme-content text-sm text-white/90 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: displayHtml }}
                    />
                  )}
                  {!loading && error && (
                    <div className="text-xs text-red-400 font-mono">{error}</div>
                  )}
                </div>
              )}

              {/* Specs details */}
              <div className="flex flex-col gap-5 border-t border-white/10 pt-6 mt-2">
                <div>
                  <h3 className="text-xs text-recruiter-accent-light uppercase font-bold tracking-wider">Arquitectura</h3>
                  <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">{project.architecture || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-xs text-recruiter-accent-light uppercase font-bold tracking-wider">Secuencia de inicio</h3>
                  <pre className="p-3 text-xs text-text-primary leading-relaxed overflow-x-auto bg-[#0a0a0a] border border-white/10 rounded-xl">{project.initSequence || 'N/A'}</pre>
                </div>
                {specsEntries.length > 0 && (
                  <div>
                    <h3 className="text-xs text-recruiter-accent-light uppercase font-bold tracking-wider mb-2">Especificaciones técnicas</h3>
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
                      {specsEntries.map(([key, value]) => (
                        <div key={key} className="flex border-b border-white/5 last:border-b-0">
                          <span className="text-xs text-white/70 uppercase px-3 py-2 border-r border-white/10 w-28 shrink-0 font-semibold">{key}</span>
                          <span className="text-xs text-text-primary px-3 py-2">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" ref={readmeBodyRef}>
            {/* OVERVIEW tab */}
            {tab === 'overview' && (
              <div className="p-5 flex flex-col gap-8">
                <div>
                  <p className={labelClass}>// DESCRIPCIÓN</p>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    {project.description || 'No hay descripción disponible.'}
                  </p>
                </div>
                <div>
                  <p className={labelClass}>// IMPACTO_DE_NEGOCIO</p>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    {project.businessImpact || 'No hay datos de impacto definidos.'}
                  </p>
                </div>
              </div>
            )}
            
            {/* README tab */}
            {tab === 'readme' && (
              <>
                {/* Breadcrumb for inline file navigation */}
                {(fileStack.length > 0) && (
                  <div className="flex items-center gap-1 px-5 pt-3 pb-0 text-xs tracking-widest flex-wrap">
                    <button
                      onClick={() => setFileStack([])}
                      className="text-cobalt hover:text-cobalt-light transition-colors"
                    >
                      README
                    </button>
                    {fileStack.map((f, i) => (
                      <React.Fragment key={f.path}>
                        <span className="text-text-faint/40">›</span>
                        {i < fileStack.length - 1 ? (
                          <button
                            onClick={() => setFileStack(prev => prev.slice(0, i + 1))}
                            className="text-cobalt hover:text-cobalt-light transition-colors"
                          >
                            {f.path.split('/').pop()}
                          </button>
                        ) : (
                          <span className="text-text-faint">{f.path.split('/').pop()}</span>
                        )}
                      </React.Fragment>
                    ))}
                    <button
                      onClick={() => setFileStack(prev => prev.slice(0, -1))}
                      className="ml-auto text-text-faint/60 hover:text-white transition-colors"
                    >
                      ← volver
                    </button>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center h-32 text-xs text-text-faint tracking-widest animate-pulse">
                    CARGANDO...
                  </div>
                )}
                {!loading && (readme || currentFile) && (
                  <div
                    className="p-5 readme-content"
                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                  />
                )}
                {!loading && error && (
                  <div className="p-5 text-xs text-err tracking-widest">{error}</div>
                )}
              </>
            )}

            {/* STACK tab */}
            {tab === 'stack' && (
              <div className="p-5 flex flex-col gap-6">
                {status && STATUS_STYLE[status] && (
                  <span className={`self-start text-sm font-bold tracking-widest uppercase border px-3 py-1.5 ${STATUS_STYLE[status]} ${isRecruiter ? 'rounded-md' : ''}`}>
                    {status.replace('_', ' ')}
                  </span>
                )}
                <div className="flex flex-col gap-3">
                  <p className={labelClass}>// Tecnologías utilizadas</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...new Set(project.stack)].map(tech => (
                      <div key={tech} className={`border bg-carbono px-4 py-3 flex flex-col gap-1 ${isRecruiter ? 'border-white/10 bg-white/[0.03] rounded-xl' : 'border-white/15'}`}>
                        <span className={`text-sm font-bold text-white uppercase ${isRecruiter ? 'font-semibold tracking-normal' : 'tracking-widest'}`}>{tech}</span>
                        {VERSION_MAP[tech]
                          ? <span className={`text-sm ${isRecruiter ? 'text-recruiter-accent-light text-xs font-medium' : 'text-cobalt tracking-widest'}`}>{VERSION_MAP[tech]}</span>
                          : <span className="text-sm text-text-faint tracking-widest">—</span>
                        }
                      </div>
                    ))}
                    {project.stack.length === 0 && (
                      <span className="text-xs text-text-faint tracking-widest col-span-3">SIN_STACK_DEFINIDO</span>
                    )}
                  </div>
                </div>
                {project.specs?.language && (
                  <div className="flex flex-col gap-2">
                    <p className={labelClass}>// Lenguaje principal</p>
                    <span className={`text-sm font-bold text-white uppercase ${isRecruiter ? 'font-semibold tracking-normal' : 'tracking-widest'}`}>{String(project.specs.language)}</span>
                  </div>
                )}
              </div>
            )}

            {/* MEDIA tab */}
            {tab === 'media' && hasVideo && (
              <div className="p-5 flex flex-col gap-4">
                <VideoEmbed url={project.specs!.video as string} />
              </div>
            )}

            {/* SPECS tab */}
            {tab === 'specs' && (
              <div className="p-5 flex flex-col gap-5">
                {project.isPrivate && (
                  <div className={`border border-err/20 bg-err/5 px-4 py-3 flex items-start gap-3 ${isRecruiter ? 'rounded-xl' : ''}`}>
                    <span className="text-err text-xs">⊘</span>
                    <div>
                      <p className="text-xs text-err font-bold tracking-widest uppercase">Proyecto privado de cliente</p>
                      <p className="text-sm text-white/70 mt-0.5">Este proyecto fue construido bajo NDA. El repositorio, código fuente y especificaciones completas no están disponibles públicamente.</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className={labelClass}>// Arquitectura</p>
                  <p className="text-xs text-text-muted leading-relaxed">{project.architecture || 'N/A'}</p>
                </div>
                <div>
                  <p className={labelClass}>// Secuencia de inicio</p>
                  <pre className={`p-3 text-xs text-text-primary leading-relaxed overflow-x-auto ${isRecruiter ? 'bg-[#0a0a0a] border border-white/10 rounded-xl' : 'bg-carbono-low border border-white/15'}`}>{project.initSequence || 'N/A'}</pre>
                </div>
                {specsEntries.length > 0 && (
                  <div>
                    <p className={labelClass}>// Especificaciones técnicas</p>
                    <div className={`border ${isRecruiter ? 'border-white/10 rounded-xl overflow-hidden' : 'border-white/15'}`}>
                      {specsEntries.map(([key, value]) => (
                        <div key={key} className={`flex border-b border-white/5 last:border-b-0 ${isRecruiter ? 'bg-white/[0.01]' : ''}`}>
                          <span className={`text-xs text-white/70 uppercase px-3 py-2 border-r w-28 shrink-0 ${isRecruiter ? 'border-white/10 font-semibold' : 'border-white/15 tracking-widest'}`}>{key}</span>
                          <span className="text-xs text-text-primary px-3 py-2">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isRecruiter && (
          project.isPrivate ? (
            <div className="border-t border-white/15 px-5 py-3 shrink-0">
              <span className={`text-xs text-err font-bold uppercase ${isRecruiter ? 'tracking-normal' : 'tracking-widest'}`}>
                [CONTRATO DE CONFIDENCIALIDAD / NDA]
              </span>
            </div>
          ) : repoUrl ? (
            <div className="border-t border-white/15 px-5 py-3 shrink-0">
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs transition-colors ${
                  isRecruiter 
                    ? 'text-recruiter-accent-light hover:text-recruiter-accent text-sm font-medium' 
                    : 'text-cobalt tracking-widest hover:text-cobalt-light'
                }`}
              >
                → {String(project.specs.repo)}
              </a>
            </div>
          ) : null
        )}
      </div>
      </div>
    </>
  );
}
