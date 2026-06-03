import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import type { Project } from '../../types';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
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
  IN_PROGRESS: 'text-warn border-warn/40 bg-warn/5',
  COMPLETED:   'text-cobalt border-cobalt/40 bg-cobalt/5',
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

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const [tab, setTab]       = useState<Tab>('overview');
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  // Inline file navigation: stack of { path, content, isMd }
  const [fileStack, setFileStack] = useState<{ path: string; content: string; isMd: boolean }[]>([]);
  const readmeBodyRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project) { setTab('overview'); setReadme(null); setFileStack([]); return; }
    const repoSlug = project.specs?.repoSlug as string | undefined;
    if (!repoSlug) { setTab('overview'); return; }
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

  if (!project) return null;

  const hasRepo    = !!(project.specs?.repoSlug);
  const hasVideo   = !!(project.specs?.video);
  const status     = project.specs?.status as string | undefined;
  const repoSlug   = project.specs?.repoSlug as string | undefined;
  const repoBase   = repoSlug ? `https://github.com/${repoSlug}/blob/main/` : '';

  function renderMarkdown(md: string): string {
    return (marked.parse(md) as string)
      .replace(/href="(?!https?:\/\/|#|mailto:)([^"]+)"/g, (_, p) =>
        `href="${repoBase}${p.replace(/^\.\//, '')}"`)
      .replace(/<a(\s)/g, '<a target="_blank" rel="noopener noreferrer"$1')
      .replace(/<img(\s)/g, '<img loading="lazy" decoding="async"$1');
  }

  // Current file being shown: either a file from the stack or the root README
  const currentFile = fileStack[fileStack.length - 1];
  const displayHtml = currentFile
    ? currentFile.isMd
      ? renderMarkdown(currentFile.content)
      : `<pre class="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">${currentFile.content.replace(/</g, '&lt;')}</pre>`
    : readme
      ? renderMarkdown(readme)
      : '';
  const specsEntries = Object.entries(project.specs || {}).filter(([k]) => !['repoSlug', 'video', 'status'].includes(k));

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
          className="border border-white/15 bg-carbono-surface w-full max-w-3xl h-[88vh] flex flex-col pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-lg font-bold text-white uppercase tracking-wider truncate">{project.name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-text-faint hover:text-white tracking-widest border border-white/15 px-2 py-1 hover:border-white/40 transition-colors duration-100 shrink-0"
          >
            [ESC]
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/15 shrink-0 flex-wrap">
          <button onClick={() => setTab('overview')} className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'overview' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}>OVERVIEW</button>
          {hasRepo && (
            <button onClick={() => setTab('readme')} className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'readme' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}>README</button>
          )}
          <button onClick={() => setTab('stack')} className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'stack' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}>STACK</button>
          <button onClick={() => setTab('specs')} className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'specs' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}>SPECS</button>
          {hasVideo && (
            <button onClick={() => setTab('media')} className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors duration-100 border-b-2 ${tab === 'media' ? 'border-cobalt text-white' : 'border-transparent text-text-faint hover:text-white'}`}>▶ MEDIA</button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" ref={readmeBodyRef}>
          {/* OVERVIEW tab */}
          {tab === 'overview' && (
            <div className="p-5 flex flex-col gap-8">
              <div>
                <p className="text-xs text-cobalt tracking-widest uppercase mb-3">// DESCRIPTION</p>
                <p className="text-sm text-white leading-relaxed font-medium">
                  {project.description || 'No description available.'}
                </p>
              </div>
              <div>
                <p className="text-xs text-cobalt tracking-widest uppercase mb-3">// BUSINESS_IMPACT</p>
                <p className="text-sm text-white leading-relaxed font-medium">
                  {project.businessImpact || 'No impact data defined.'}
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
                    ← back
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-32 text-xs text-text-faint tracking-widest animate-pulse">
                  FETCHING...
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
                <span className={`self-start text-sm font-bold tracking-widest uppercase border px-3 py-1.5 ${STATUS_STYLE[status]}`}>
                  {status.replace('_', ' ')}
                </span>
              )}
              <div className="flex flex-col gap-3">
                <p className="text-xs text-cobalt tracking-widest uppercase">// Technologies used</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...new Set(project.stack)].map(tech => (
                    <div key={tech} className="border border-white/15 bg-carbono px-4 py-3 flex flex-col gap-1">
                      <span className="text-sm font-bold text-white tracking-widest uppercase">{tech}</span>
                      {VERSION_MAP[tech]
                        ? <span className="text-sm text-cobalt tracking-widest">{VERSION_MAP[tech]}</span>
                        : <span className="text-sm text-text-faint tracking-widest">—</span>
                      }
                    </div>
                  ))}
                  {project.stack.length === 0 && (
                    <span className="text-xs text-text-faint tracking-widest col-span-3">NO_STACK_DEFINED</span>
                  )}
                </div>
              </div>
              {project.specs?.language && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-cobalt tracking-widest uppercase">// Primary language</p>
                  <span className="text-sm font-bold text-white tracking-widest uppercase">{String(project.specs.language)}</span>
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
                <div className="border border-err/20 bg-err/5 px-4 py-3 flex items-start gap-3">
                  <span className="text-err text-xs">⊘</span>
                  <div>
                    <p className="text-xs text-err font-bold tracking-widest uppercase">Private client project</p>
                    <p className="text-sm text-white/70 mt-0.5">This project was built under NDA. Repository, source code and full specs are not publicly available.</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// Architecture</p>
                <p className="text-xs text-text-muted leading-relaxed">{project.architecture || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// Init Sequence</p>
                <pre className="bg-carbono-low border border-white/15 p-3 text-xs text-text-primary leading-relaxed overflow-x-auto">{project.initSequence || 'N/A'}</pre>
              </div>
              {specsEntries.length > 0 && (
                <div>
                  <p className="text-xs text-cobalt tracking-widest uppercase mb-2">// Technical Specs</p>
                  <div className="border border-white/15">
                    {specsEntries.map(([key, value]) => (
                      <div key={key} className="flex border-b border-white/5 last:border-b-0">
                        <span className="text-xs text-white/70 tracking-widest uppercase px-3 py-2 border-r border-white/15 w-28 shrink-0">{key}</span>
                        <span className="text-xs text-text-primary px-3 py-2">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {project.specs?.repo && (
          <div className="border-t border-white/15 px-5 py-2 shrink-0">
            <a
              href={`https://${project.specs.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cobalt tracking-widest hover:text-cobalt-light transition-colors"
            >
              → {String(project.specs.repo)}
            </a>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
