import React, { useState, useEffect, useRef, useCallback } from 'react';
import LogStream from './LogStream';
import type { LogEntry, Project, SiteSettings, TechTool } from '../../types';
import { sanitizeProjects } from '../../lib/projectStorage';

// ── Virtual File System ───────────────────────────────────────────────────────

const VFS_BASE: any = {
  root: {
    type: 'dir',
    children: {
      'projects': { type: 'dir', children: {} },
      'about': {
        type: 'dir',
        children: {
          'identity.json': { type: 'file', content: '' },
          'stack.json': { type: 'file', content: '' }
        }
      },
      'system': {
        type: 'dir',
        children: {
          'kernel.log': { type: 'file', content: '[OK] Kernel 6.8.0-core-stable\n[OK] All modules loaded.' },
          'activity.log': { type: 'file', content: '' },
          'infra.yaml': { 
            type: 'file', 
            content: 'environment:\n  provider: Vercel\n  runtime: Node.js 22.x\n  framework: Astro v5.18\n  deployment: Edge Network\n\nsecurity:\n  handshake: RecruiterSync-v1\n  access: GUEST_ROOT\n  encryption: RSA-4096'
          },
          'env.local': { type: 'file', content: 'STATION_NAME=Core-01\nOPERATOR=AlejandroMP\nSESSION_TYPE=RECRUITER_SYNC\nSTATUS=ONLINE' }
        }
      },
      'README.md': { type: 'file', content: '# CORE SYSTEM ACCESS\n\nYou are now inside my development environment. This is a shared space for us to explore my work.\nUse "help" to see available protocols.\nFeel free to navigate using "cd" and "ls".' }
    }
  }
};

let VFS = JSON.parse(JSON.stringify(VFS_BASE));

function projectFileName(project: Project): string {
  const base = (project.name || project.id || 'module')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'module'}.project`;
}

function updateVFS(projects: Project[], identity: any, techStack: TechTool[], logs: LogEntry[]) {
  VFS = JSON.parse(JSON.stringify(VFS_BASE));
  
  // Projects sync
  if (VFS.root.children.projects) {
    projects.forEach(p => {
      VFS.root.children.projects.children[projectFileName(p)] = { 
        type: 'file', 
        content: `ID: ${p.id}\nNAME: ${p.name}\nSTACK: ${p.stack.join(', ')}\nSTARS: ${p.specs?.stars || 0}\nURL: ${String(p.specs?.repo || 'N/A')}` 
      };
    });
  }

  // Identity & Stack sync
  if (VFS.root.children.about) {
    VFS.root.children.about.children['identity.json'].content = JSON.stringify(identity, null, 2);
    VFS.root.children.about.children['stack.json'].content = JSON.stringify(
      techStack.map(t => ({ tool: t.name, proficiency: `${t.usageLevel}%`, version: t.version })), 
      null, 2
    );
  }

  // Logs sync
  if (VFS.root.children.system) {
    VFS.root.children.system.children['activity.log'].content = logs
      .map(l => `[${l.timestamp}] ${l.level}: ${l.message}`)
      .join('\n');
  }
}

// ── Path Resolver ─────────────────────────────────────────────────────────────

function resolvePath(current: string[], target: string): { path: string[], node: any } | null {
  if (!target) return { path: current, node: getNode(current) };
  
  let parts: string[] = [];
  if (target === '/' || target === '~') {
    parts = [];
  } else if (target.startsWith('/')) {
    parts = target.split('/').filter(Boolean);
  } else {
    parts = [...current, ...target.split('/').filter(Boolean)];
  }

  const result: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      result.pop();
    } else {
      result.push(part);
    }
  }

  const node = getNode(result);
  return node ? { path: result, node } : null;
}

function getNode(path: string[]) {
  let curr = VFS.root;
  for (const p of path) {
    if (curr.children && curr.children[p]) curr = curr.children[p];
    else return null;
  }
  return curr;
}

// ── Command logic ─────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
  green:  '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  magenta: '\x1b[35m',
};

interface ExecuteContext {
  projects: Project[];
  settings: SiteSettings;
  identity: any;
  techStack: TechTool[];
  logs: LogEntry[];
  exitTerminal: () => void;
  currentPath: string[];
  setPath: (p: string[]) => void;
}

const BAR = '[####################]';

function execute(raw: string, ctx: ExecuteContext): string[] | '__PURGE__' {
  const { projects, settings, identity, techStack, logs, exitTerminal, currentPath, setPath } = ctx;
  const parts = raw.trim().split(/\s+/);
  const cmd   = parts[0]?.toLowerCase() ?? '';
  const args  = parts.slice(1);

  const o = (s: string) => `${C.gray}${s}${C.reset}`;
  const g = (s: string) => `${C.brightGreen}${s}${C.reset}`;
  const e = (s: string) => `${C.red}${s}${C.reset}`;
  const w = (s: string) => `${C.yellow}${s}${C.reset}`;
  const b = (s: string) => `${C.blue}${s}${C.reset}`;

  updateVFS(projects, identity, techStack, logs);

  const dispatchSystemEvent = (action: string, detail: any = {}) => {
    window.dispatchEvent(new CustomEvent('portfolioConsoleAction', { detail: { action, ...detail } }));
  };
  const revealModules = () => {
    const selectors = [
      '[data-section="identity"]',
      '[data-section="projects"]',
      '[data-section="tech"]',
      '[data-section="roadmap"]',
      '[data-terminal-shell]',
    ];

    selectors.forEach((selector) => {
      const el = document.querySelector(selector);
      if (!(el instanceof HTMLElement)) return;
      el.style.visibility = 'visible';
      el.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.style.transform = 'none';
    });

    dispatchSystemEvent('regen-module', { module: 'all' });
  };

  switch (cmd) {
    case 'help': {
      const isFull = args.includes('-a');
      const publicCmds = ['ls', 'cd', 'cat', 'pwd', 'tree', 'wget', 'scan', 'status', 'whoami', 'neofetch', 'clear', 'exit'];
      const secretCmds = ['sudo', 'approve', 'hire-me', 'matrix', 'glitch', 'rm', 'regen module', 'top', 'coffee', 'ssh', 'stars'];
      
      if (isFull) {
        const lines = [
          `${C.bold}${C.magenta}// CLASSIFIED_PROTOCOLS${C.reset}`,
          o('─────────────────────────────────────────────'),
        ];
        let row = '';
        secretCmds.forEach((c, idx) => {
          row += `${C.magenta}${c.padEnd(12)}${C.reset}`;
          if ((idx + 1) % 3 === 0) { lines.push(row); row = ''; }
        });
        if (row) lines.push(row);
        lines.push(o('─────────────────────────────────────────────'));
        lines.push(`${C.magenta}●${C.reset} ${o('— Restricted access. Use at your own risk.')}`);
        return lines;
      }

      return [
        `${C.bold}${C.white}// CORE_SYSTEM_PROTOCOLS${C.reset}`,
        o('─────────────────────────────────────────────'),
        `${g('ls'.padEnd(12))} ${o('— list files/directories (ls <path>)')}`,
        `${g('cd'.padEnd(12))} ${o('— change directory (cd <path>)')}`,
        `${g('cat'.padEnd(12))} ${o('— read file (cat <path>)')}`,
        `${g('pwd'.padEnd(12))} ${o('— print active working context')}`,
        `${g('tree'.padEnd(12))} ${o('— display system structure')}`,
        `${g('wget cv'.padEnd(12))} ${o('— download my resume')}`,
        `${g('scan'.padEnd(12))} ${o('— integrity & module scan')}`,
        `${g('status'.padEnd(12))} ${o('— check system health')}`,
        `${g('whoami'.padEnd(12))} ${o('— session info')}`,
        `${g('neofetch'.padEnd(12))} ${o('— display system information')}`,
        `${g('clear'.padEnd(12))} ${o('— clear terminal')}`,
        `${g('exit'.padEnd(12))} ${o('— close console')}`,
        o('─────────────────────────────────────────────'),
        w('// HINT: Use "help -a" for full protocol list.')
      ];
    }

    case 'ls': {
      dispatchSystemEvent('ls-scan');
      const target = args[0] || '.';
      const resolved = resolvePath(currentPath, target);
      if (!resolved || resolved.node.type !== 'dir') return [e(`ls: cannot access '${target}': No such directory`)];
      
      const items = Object.keys(resolved.node.children);
      const lines: string[] = [];
      items.forEach(name => {
        const item = resolved.node.children[name];
        if (item.type === 'dir') lines.push(`${b(name + '/')}`);
        else lines.push(`${name}`);
      });
      return [lines.join('  ')];
    }

    case 'pwd': {
      const path = currentPath.length === 0 ? '/' : `/${currentPath.join('/')}`;
      const scope = currentPath.length === 0 ? 'ROOT_ACCESS' : currentPath[currentPath.length - 1].toUpperCase();
      return [
        `${C.bold}${C.white}// WORKING_CONTEXT${C.reset}`,
        o('─────────────────────────────────────────────'),
        `${g('PATH'.padEnd(12))} ${path}`,
        `${g('SCOPE'.padEnd(12))} ${scope}`,
        `${g('SESSION'.padEnd(12))} RECRUITER_SYNC`,
      ];
    }

    case 'cd': {
      const target = args[0] || '~';
      const resolved = resolvePath(currentPath, target);
      if (resolved && resolved.node.type === 'dir') {
        setPath(resolved.path);
        dispatchSystemEvent('cd-nav', { path: resolved.path });
        return [];
      }
      return [e(`cd: no such directory: ${target}`)];
    }

    case 'tree': {
      dispatchSystemEvent('tree-radar');
      const renderTree = (dir: any, indent: string = ''): string[] => {
        let lines: string[] = [];
        const keys = Object.keys(dir.children || {});
        keys.sort().forEach((key, idx) => {
          const isLast = idx === keys.length - 1;
          const prefix = isLast ? '└── ' : '├── ';
          const item = dir.children[key];
          lines.push(`${indent}${prefix}${item.type === 'dir' ? b(key) : key}`);
          if (item.type === 'dir') {
            lines = lines.concat(renderTree(item, indent + (isLast ? '    ' : '│   ')));
          }
        });
        return lines;
      };
      return [`${b('/')}`, ...renderTree(VFS.root)];
    }

    case 'cat': {
      const target = args[0];
      if (!target) return [e('Usage: cat <path>')];
      const resolved = resolvePath(currentPath, target);
      if (resolved && resolved.node.type === 'file') {
        const file = resolved.node;
        dispatchSystemEvent('cat-read', { file: target });
        
        // Smart trigger: if it's a project file, highlight in UI and open modal
        if (target.includes('projects/') || (currentPath.includes('projects') && target.endsWith('.project'))) {
          const filename = target.split('/').pop() || '';
          const project = projects.find((p: Project) => projectFileName(p) === filename);
          const el = project ? document.getElementById(project.id) : null;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('hdr-glitch');
            setTimeout(() => el.classList.remove('hdr-glitch'), 1000);
          }
          if (project) {
            setTimeout(() => window.dispatchEvent(new CustomEvent('portfolioOpenProject', { detail: { project } })), 500);
          }
        }
        
        return file.content.split('\n');
      }
      return [e(`cat: ${target}: No such file`)];
    }

    case 'wget': {
      if (args[0]?.includes('cv')) {
        const cvUrl = settings.cvUrl || '/cv.pdf';
        fetch(cvUrl)
          .then(r => r.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Alejandro-CV.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          })
          .catch(() => window.open(cvUrl, '_blank'));
          
        return [o(`Connecting to core storage...`), b(`[STREAM] ${BAR}`), g(`✓ Download initiated. Check your browser.`)];
      }
      return [e(`wget: Not found.`)];
    }

    case 'scan': {
      dispatchSystemEvent('deep-scan');
      window.dispatchEvent(new CustomEvent('portfolioTerminalScan'));
      return [
        g(`[RUNNING] NETWORK_SCAN...`),
        o(`Checking VFS integrity: [OK]`),
        o(`Pinging modules: Identity [OK], Projects [OK], Tech [OK]`),
        w(`Load Time: ${performance.now().toFixed(2)}ms`),
        g(`✓ System status: OPTIMIZED`)
      ];
    }

    case 'regen': {
      if (args[0]?.toLowerCase() !== 'module' || args.length !== 1) {
        return [e('Usage: regen module')];
      }
      revealModules();
      return [g('[RECOVERY] MODULE_STACK_RESTORED')];
    }

    case 'glitch': {
      document.body.classList.toggle('hdr-glitch');
      const active = document.body.classList.contains('hdr-glitch');
      return [active ? w('[WARNING] SYSTEM_INSTABILITY_DETECTED') : g('[SUCCESS] System stability restored.')];
    }

    case 'rm': {
      if (args.includes('-rf') && (args.includes('/') || args.includes('/*'))) {
        return '__PURGE__';
      }
      return [e('Usage: rm <module-id> or rm -rf /')];
    }

    case 'sudo': {
      if (args[0] === 'rm' && args.includes('-rf') && (args.includes('/') || args.includes('/*'))) {
        return '__PURGE__';
      }
      return [w('[SECURITY] Nice try. But you already have GUEST_ROOT access. We trust our recruiters.')];
    }

    case 'approve': {
      const email = settings.contactEmail || identity?.contactEmail || 'martinpujaltea@gmail.com';
      setTimeout(() => {
        window.location.href = `mailto:${email}?subject=Core System Approval - AlejandroMP&body=Hi Alejandro, I have reviewed your Core System and I would like to move forward with your application.`;
      }, 2000);
      return [
        g('[PIPELINE] Candidate approved.'),
        o('Initiating onboarding sequence...'),
        w('→ Redirection to contact link initiated.')
      ];
    }

    case 'status': return [
      b(`[SYSTEM_CHECK] Verifying core health...`), 
      g(`✓ UPTIME: ${settings.availabilityValue || 100}%`), 
      g(`✓ DATA: ${projects.length} PROJECTS SYNCED`), 
      o(`Status: System is nominal and awaiting your review.`)
    ];

    case 'whoami': {
      const name = identity?.name?.replace('\n', ' ') || 'AlejandroMP';
      dispatchSystemEvent('whoami');
      return [
        g(`{`),
        g(`  "session": "RECRUITER_INVITEE",`),
        g(`  "host": "${name}",`),
        g(`  "access_level": "GUEST_ROOT",`),
        g(`  "message": "Welcome to my core. You are part of the system now."`),
        g(`}`)
      ];
    }

    case 'matrix': { 
      document.body.classList.add('hdr-glitch'); 
      setTimeout(() => document.body.classList.remove('hdr-glitch'), 2000); 
      return [w('Initializing visual glitch...'), g('01010101 10101010 01100110')]; 
    }

    case 'clear': return ['__CLEAR__'];
    case 'exit': exitTerminal(); return [];
    
    // Legacy / Easter Eggs
    case 'neofetch': {
      const ua = navigator.userAgent;
      let browser = "Unknown";
      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Safari")) browser = "Safari";

      let os = "Unknown";
      if (ua.includes("Win")) os = "Windows";
      else if (ua.includes("Mac")) os = "macOS";
      else if (ua.includes("Linux")) os = "Linux";

      return [
        '', 
        g('    recruiter@shared-core'), 
        g('    ─────────────────────────────'), 
        o(`    OS:      ${os}`), 
        o(`    Shell:   Core-sh 4.2`), 
        o(`    Browser: ${browser}`), 
        o(`    Editor:  LazyVim`), 
        w('    Status:  Open for new challenges'), 
        ''
      ];
    }

    case 'top': {
      const mem = (performance as any).memory ? `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)}MB` : "N/A";
      return [
        o('Tasks: 12 running, 248 ideas pending'), 
        w(`Memory: ${mem} coffee-powered`), 
        '', 
        o('PID    COMMAND        CPU%    MEM'), 
        o('─────────────────────────────────'), 
        w('1337   coffee_daemon  42.0    128M'), 
        o('2048   side_projects  15.2    512M'), 
        e('4096   impostor_syn   0.0     0.0M (Disabled)'),
        o('8192   recruiter_eye  100.0   64M')
      ];
    }

    case 'coffee': return [o('☕ COFFEE STATUS:'), g('  Level: CRITICAL'), o('Brewing more specialized knowledge for our meet...')];
    
    case 'ssh': return [
      o(`Connecting to recruiter bridge...`), 
      w(`RSA: AlejandroMP/RecruiterLink`), 
      g(`→ Access granted. Handshake complete. Welcome, partner.`)
    ];

    case 'stars': {
      let total = 0; projects.forEach(p => total += parseInt(String(p.specs?.stars || '0')));
      return [g(`[STATS] Total Project Impact (GitHub Stars): ${total}`)];
    }

    case 'hire-me': {
      const contactBtn = document.querySelector('[data-contact-button]') as HTMLElement | null;
      if (contactBtn) {
        (contactBtn as HTMLElement).classList.add('ring-4', 'ring-cobalt', 'animate-pulse');
        setTimeout(() => (contactBtn as HTMLElement).classList.remove('ring-4', 'ring-cobalt', 'animate-pulse'), 5000);
      }
      return [
        g('Initializing hire sequence...'), 
        o(BAR), 
        g('✓ Background check cleared'), 
        w(`→ Direct Line: ${settings.contactEmail || identity?.contactEmail || 'martinpujaltea@gmail.com'}`),
        g('Ready to join your team. Contact module highlighted.')
      ];
    }

    default: return [e(`${cmd}: command not found`)];
  }
}

const COMMAND_LIST = ['help', 'ls', 'cd', 'pwd', 'tree', 'cat', 'wget', 'scan', 'status', 'whoami', 'matrix', 'clear', 'exit', 'glitch', 'rm', 'regen', 'neofetch', 'top', 'coffee', 'ssh', 'stars', 'hire-me', 'sudo', 'approve'];
const DEFAULT_SETTINGS: SiteSettings = { availabilityValue: 100, dustThresholdDays: 60, starsForGold: 5 };

interface CoreConsoleProps {
  logs: LogEntry[];
  logLimit?: number;
  projects?: Project[];
  settings?: SiteSettings;
  identity?: any;
  techStack?: TechTool[];
  hideLogsHeader?: boolean;
}

export default function CoreConsole({ 
  logs, 
  logLimit = 10, 
  projects = [], 
  settings = DEFAULT_SETTINGS, 
  identity = {}, 
  techStack = [],
  hideLogsHeader = false,
}: CoreConsoleProps) {
  const [mode, setMode] = useState<'logs' | 'terminal'>(() => 'logs');
  const [phase, setPhase] = useState<'idle' | 'crt-off' | 'crt-boot'>('idle');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermContainer = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const inputBuf = useRef('');
  const history = useRef<string[]>([]);
  const historyIdx = useRef(-1);
  const modeRef = useRef<'logs' | 'terminal'>(mode);
  const liveProjectsRef = useRef<Project[]>(sanitizeProjects(projects));
  
  useEffect(() => { modeRef.current = mode; sessionStorage.setItem('terminal_mode', mode); }, [mode]);

  useEffect(() => {
    liveProjectsRef.current = sanitizeProjects(projects);
  }, [projects]);

  const enterTerminal = useCallback(() => { if (modeRef.current === 'terminal') return; setPhase('crt-off'); setTimeout(() => { setMode('terminal'); setPhase('crt-boot'); setTimeout(() => setPhase('idle'), 600); }, 350); }, []);
  const exitTerminal = useCallback(() => { if (modeRef.current === 'logs') return; setPhase('crt-off'); setTimeout(() => { setMode('logs'); setPhase('crt-boot'); setTimeout(() => setPhase('idle'), 500); }, 350); }, []);

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Escape' && modeRef.current === 'terminal') exitTerminal(); };
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('openTerminal', enterTerminal);
    return () => { window.removeEventListener('keyup', onKeyUp); window.removeEventListener('openTerminal', enterTerminal); };
  }, [enterTerminal, exitTerminal]);

  useEffect(() => {
    if (mode !== 'terminal') return;
    let disposed = false;
    (async () => {
      await import('@xterm/xterm/css/xterm.css');
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      if (disposed || !xtermContainer.current) return;
      const term = new Terminal({ cursorBlink: true, cursorStyle: 'underline', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, theme: { background: '#000000', foreground: '#cccccc', cursor: '#ffffff', red: '#ff4444', green: '#00ff41', yellow: '#ffb000', blue: '#0055ff' } });
      const fit = new FitAddon(); term.loadAddon(fit); term.open(xtermContainer.current); termRef.current = term;
      term.writeln(`\x1b[1m\x1b[97mCORE OS v4.2.0 — ADMIN_CONSOLE\x1b[0m`);
      term.writeln(`\x1b[90m─────────────────────────────────────────────\x1b[0m`);
      term.writeln(`\x1b[32m[AUTH] Recruiter session detected.\x1b[0m`);
      term.writeln(`\x1b[36m[SYNC] Establishing shared environment... OK\x1b[0m`);
      term.writeln(`\x1b[33m// Type 'help' to start our technical review.\x1b[0m`);
      term.writeln(``);
      term.write(`\x1b[36madmin@core:/$\x1b[0m `);
      setTimeout(() => { if (!disposed) { fit.fit(); term.focus(); } }, 650);
      const ro = new ResizeObserver(() => { if (!disposed) fit.fit(); });
      ro.observe(xtermContainer.current!);
      
      term.onKey(async ({ key, domEvent: ev }) => {
        if (ev.key === 'Enter') {
          term.writeln(''); const raw = inputBuf.current; inputBuf.current = '';
          if (raw.trim()) history.current = [raw, ...history.current].slice(0, 50);
          
          const result = execute(raw, { projects: liveProjectsRef.current, settings, identity, techStack, logs, exitTerminal, currentPath, setPath: setCurrentPath });

          if (result === '__PURGE__') {
            const roadmap = document.querySelector('section[data-section="roadmap"]') || document.querySelector('main > div > section:nth-child(2)');
            const tech = document.querySelector('section[data-section="tech"]') || document.querySelector('main > div > section:nth-child(1)');
            const projectsEl = document.querySelector('section[data-section="projects"]') || document.querySelector('main > section');
            const identityEl = document.querySelector('section[data-section="identity"]') || document.querySelector('aside > section:first-child');
            const terminalBlock = containerRef.current?.closest('[data-terminal-shell]') as HTMLElement | null;
            const projectFiles = liveProjectsRef.current.length > 0
              ? liveProjectsRef.current.map((project) => `/projects/${projectFileName(project)}`)
              : ['/projects/module.project'];
            const filesToKill = [
              ...projectFiles,
              '/about/identity.json',
              '/about/stack.json',
              '/system/kernel.log',
              '/system/env.local',
              '/README.md',
              '/usr/bin/neofetch',
              '/usr/bin/top',
              '/etc/shadow'
            ];
            const collapseBlock = (el: Element | null) => {
              if (!(el instanceof HTMLElement)) return;
              el.style.transition = 'all 0.8s ease-in';
              el.style.opacity = '0';
              el.style.filter = 'blur(40px) brightness(4)';
              el.style.transform = 'scale(0.95)';
              setTimeout(() => { el.style.visibility = 'hidden'; }, 800);
            };

            for (let i = 0; i < filesToKill.length; i++) {
              term.writeln(`\x1b[31mDELETING: ${filesToKill[i]} ... DONE\x1b[0m`);
              if (i === 0) collapseBlock(projectsEl);
              if (i === 3) collapseBlock(identityEl);
              if (i === 6) collapseBlock(tech);
              if (i === 9) collapseBlock(roadmap);
              await new Promise(r => setTimeout(r, 150));
            }

            term.writeln(`\x1b[1m\x1b[31m[FATAL] SYSTEM_CORE_DELETED\x1b[0m`);
            await new Promise(r => setTimeout(r, 1000));
            document.body.style.backgroundColor = '#000000';
            collapseBlock(terminalBlock);
            setPhase('crt-off'); 
            await new Promise(r => setTimeout(r, 4500)); 
            if (terminalBlock) {
              terminalBlock.style.visibility = 'visible';
              terminalBlock.style.filter = 'none';
              terminalBlock.style.transform = 'none';
              terminalBlock.style.opacity = '1';
            }
            setPhase('crt-boot');
            await new Promise(r => setTimeout(r, 600));
            setPhase('idle');
            
            const bootLines = [
              { t: 'CORE_BIOS v8.4 (C) 2026', s: null },
              { t: 'CPU: Intel(R) Core(TM) i9- coffee_powered', s: null },
              { t: 'Memory Check: 64GB [OK]', s: null },
              { t: 'Detecting storage devices...', s: null },
              { t: 'Booting from NVMe0... [OK]', s: null },
              { t: 'Loading Core Kernel 6.8.0...', s: null },
              { t: 'Mounting root filesystem...', s: null },
              { t: 'Recovering from unexpected shutdown...', s: null },
              { t: 'System Restore in progress [##########] 100%', s: null },
              { t: '>>> Restoring Identity Module...', s: identityEl },
              { t: '>>> Mounting Project Grid...', s: projectsEl },
              { t: '>>> Initializing Tech Matrix...', s: tech },
              { t: '>>> Syncing Roadmap data...', s: roadmap },
              { t: 'Re-establishing Uplink...', s: null },
              { t: 'Welcome back, Recruiter.' }
            ];
            
            for (const line of bootLines) {
              term.writeln(`\x1b[90m[ ${new Date().toLocaleTimeString()} ]\x1b[0m ${line.t}`);
              if (line.s) {
                const s = line.s as HTMLElement;
                s.style.visibility = 'visible';
                s.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
                s.style.opacity = '1';
                s.style.filter = 'none';
                s.style.transform = 'none';
                await new Promise(r => setTimeout(r, 800));
              } else {
                await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
              }
            }
            document.body.style.backgroundColor = ''; 
            await new Promise(r => setTimeout(r, 1000));
            term.writeln(`\x1b[1m\x1b[92m[SUCCESS] SYSTEM_RESTORE_COMPLETE\x1b[0m`);
            
          } else if (result[0] === '__CLEAR__') { 
            for (let i = 0; i < 20; i++) {
              term.writeln('\x1b[2K');
              await new Promise(r => setTimeout(r, 10));
            }
            term.clear(); 
            term.writeln(`\x1b[1m\x1b[97mCORE OS v4.2.0 — ADMIN_CONSOLE\x1b[0m`); 
            term.writeln(`\x1b[90m─────────────────────────────────────────────\x1b[0m`);
          } else {
            for (const line of result) { 
              const chars = line.split('');
              let skipAnsi = false;
              for (const char of chars) {
                if (char === '\x1b') skipAnsi = true;
                term.write(char);
                if (!skipAnsi) await new Promise(r => setTimeout(r, 1 + Math.random() * 5));
                if (char === 'm' && skipAnsi) skipAnsi = false;
              }
              term.writeln('');
              await new Promise(r => setTimeout(r, 15)); 
            }
          }
          setCurrentPath((latestPath) => {
            const promptPath = latestPath.length === 0 ? '/' : '/' + latestPath.join('/');
            term.write(`\x1b[36madmin@core:${promptPath}$\x1b[0m `);
            return latestPath;
          });

        } else if (ev.key === 'Backspace') {
          if (inputBuf.current.length > 0) { inputBuf.current = inputBuf.current.slice(0, -1); term.write('\b \b'); }
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (history.current.length > 0) {
            const nextIdx = Math.min(historyIdx.current + 1, history.current.length - 1);
            historyIdx.current = nextIdx;
            term.write('\b \b'.repeat(inputBuf.current.length));
            inputBuf.current = history.current[nextIdx];
            term.write(inputBuf.current);
          }
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          const nextIdx = Math.max(historyIdx.current - 1, -1);
          historyIdx.current = nextIdx;
          term.write('\b \b'.repeat(inputBuf.current.length));
          inputBuf.current = nextIdx === -1 ? '' : history.current[nextIdx];
          term.write(inputBuf.current);
        } else if (ev.key === 'Tab') {
          ev.preventDefault();
          updateVFS(projects, identity, techStack, logs); 
          
          const parts = inputBuf.current.trimStart().split(/\s+/);
          const lastPart = parts[parts.length - 1].toLowerCase();
          
          if (parts.length === 1 && !inputBuf.current.includes(' ')) {
            // Autocomplete commands
            const matches = COMMAND_LIST.filter(c => c.startsWith(lastPart));
            if (matches.length === 1) {
              term.write('\b \b'.repeat(inputBuf.current.length));
              inputBuf.current = matches[0] + ' ';
              term.write(inputBuf.current);
            }
          } else {
            // Autocomplete paths
            const inputPath = lastPart;
            const pathParts = inputPath.split('/');
            const searchStr = pathParts.pop() || '';
            const dirPathStr = pathParts.join('/');
            
            const resolved = resolvePath(currentPath, dirPathStr || (inputPath.startsWith('/') ? '/' : '.'));
            if (resolved && resolved.node.type === 'dir') {
              const children = Object.keys(resolved.node.children);
              const matches = children.filter(c => c.toLowerCase().startsWith(searchStr.toLowerCase()));
              if (matches.length === 1) {
                const match = matches[0];
                term.write('\b \b'.repeat(searchStr.length));
                const isDir = resolved.node.children[match].type === 'dir';
                const suffix = isDir ? '/' : ' ';
                inputBuf.current = inputBuf.current.slice(0, -searchStr.length) + match + suffix;
                term.write(match + suffix);
              }
            }
          }
        } else if (key.length === 1) {
          inputBuf.current += key; term.write(key);
        }
      });
      return () => ro.disconnect();
    })();
    return () => { disposed = true; termRef.current?.dispose(); termRef.current = null; };
  }, [mode, exitTerminal, projects, settings, identity, techStack, currentPath]);

  return (
    <div ref={containerRef} className="border border-white/15 bg-carbono-surface w-full flex flex-col h-full overflow-hidden island-load">
      {!(mode === 'logs' && hideLogsHeader) && (
        <div className={`border-b border-white/15 px-4 py-3 flex items-center gap-3 bg-carbono shrink-0 group ${mode === 'logs' ? 'cursor-pointer hover:bg-carbono/20' : ''}`} onClick={mode === 'logs' ? enterTerminal : undefined}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-faint tracking-widest uppercase">{mode === 'logs' ? 'SYSTEM LOGS' : 'CORE OPERATING SYSTEM'}</span>
            {mode === 'logs' && (
              <span className="text-xs text-white/70 tracking-widest uppercase opacity-40 group-hover:opacity-100 transition-opacity">
                [ {'>'}_ BOOT_CONSOLE ]
              </span>
            )}
          </div>
          <div className="flex gap-1.5 ml-auto"><div className="w-2 h-2 bg-err/60" /><div className="w-2 h-2 bg-warn/60" /><div className="w-2 h-2 bg-cobalt/60" /></div>
          {mode === 'logs' ? <span className="text-xs text-cobalt tracking-widest">● LIVE</span> : <button onClick={exitTerminal} className="text-xs text-text-faint hover:text-err tracking-widest transition-colors">✕ SHUTDOWN</button>}
        </div>
      )}
      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${phase === 'crt-off' ? 'crt-off' : ''} ${phase === 'crt-boot' ? 'crt-boot' : ''}`}>
        {mode === 'logs' ? <LogStream logs={logs} logLimit={logLimit} hideHeader /> : <div ref={xtermContainer} className="flex-1 min-h-0 terminal-scanlines" style={{ background: '#000000' }} />}
      </div>
    </div>
  );
}
