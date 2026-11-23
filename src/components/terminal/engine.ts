// Motor de comandos de la terminal de /dev (sin DOM: los efectos sobre la página
// se piden a través de `Effects`). Mismo juego de comandos que la antigua CoreConsole,
// sin `status`, más el alias `log`.

export type Span = [cls: string, text: string];
export type Line = string | Span[];
export type Result = Line[] | 'PURGE' | 'CLEAR';

export interface TermProject {
  slug: string;
  name: string;
  stack: string[];
  stars: number;
  repo: string;
  priv: boolean;
}

export interface TermData {
  identity: Record<string, unknown> & { name: string };
  projects: TermProject[];
  stack: { group: string; items: string[] }[];
  logs: { timestamp: string; level: string; message: string }[];
  cvUrl: string;
  email: string;
  host: string;
}

export interface Effects {
  openProject: (slug: string) => void;
  downloadCv: () => void;
  openMail: () => void;
  highlightContact: () => void;
  toggleGlitch: () => boolean;
  pulseGlitch: () => void;
  restoreModules: () => void;
  closeTerminal: () => void;
}

interface VNode {
  type: 'dir' | 'file';
  content?: string;
  children?: Record<string, VNode>;
}

export const COMMAND_LIST = [
  'help', 'ls', 'cd', 'pwd', 'tree', 'cat', 'wget', 'scan', 'whoami', 'matrix', 'clear', 'exit',
  'glitch', 'rm', 'regen', 'neofetch', 'top', 'coffee', 'ssh', 'stars', 'hire-me', 'sudo', 'approve', 'log',
];

export const RULE = '─────────────────────────────────────────────';
const BAR = '[####################]';

// ── Salida ──────────────────────────────────────────────────────────────────
const o = (t: string): Span[] => [['f', t]]; // gris
const g = (t: string): Span[] => [['ok', t]]; // acento
const e = (t: string): Span[] => [['e', t]]; // error
const w = (t: string): Span[] => [['w', t]]; // aviso
const b = (t: string): Span[] => [['bl', t]]; // azul
const title = (t: string): Span[] => [['c bd', t]];

export const banner = (): Line[] => [title('CORE OS v4.2.0 — CONSOLA_ADMIN'), o(RULE)];
export const welcome = (): Line[] => [
  ...banner(),
  [['ok', '[AUTH] Sesión de reclutador detectada.']],
  [['ok', '[SYNC] Estableciendo entorno compartido... OK']],
  w("// Escribe 'help' para empezar nuestra revisión técnica."),
  '',
];

// ── Sistema de archivos virtual ─────────────────────────────────────────────
export function projectFileName(p: { slug: string }): string {
  return `${p.slug}.project`;
}

function buildVfs(d: TermData): VNode {
  const projects: Record<string, VNode> = {};
  d.projects.forEach((p) => {
    projects[projectFileName(p)] = {
      type: 'file',
      content: `ID: ${p.slug}\nNAME: ${p.name}\nSTACK: ${p.stack.join(', ')}\nSTARS: ${p.stars}\nURL: ${p.priv ? 'N/A' : p.repo || 'N/A'}`,
    };
  });
  return {
    type: 'dir',
    children: {
      projects: { type: 'dir', children: projects },
      about: {
        type: 'dir',
        children: {
          'identity.json': { type: 'file', content: JSON.stringify(d.identity, null, 2) },
          'stack.json': { type: 'file', content: JSON.stringify(d.stack, null, 2) },
        },
      },
      system: {
        type: 'dir',
        children: {
          'kernel.log': { type: 'file', content: '[OK] Kernel 6.8.0-core-stable\n[OK] All modules loaded.' },
          'activity.log': {
            type: 'file',
            content: d.logs.map((l) => `[${l.timestamp}] ${l.level}: ${l.message}`).join('\n'),
          },
          'infra.yaml': {
            type: 'file',
            content:
              'environment:\n  provider: Vercel\n  runtime: Node.js 22.x\n  framework: Astro v5.18\n  deployment: Edge Network\n\nsecurity:\n  handshake: RecruiterSync-v1\n  access: GUEST_ROOT\n  encryption: RSA-4096',
          },
          'env.local': { type: 'file', content: 'STATION_NAME=Core-01\nOPERATOR=AlejandroMP\nSESSION_TYPE=RECRUITER_SYNC' },
        },
      },
      'README.md': {
        type: 'file',
        content:
          '# ACCESO AL SISTEMA CORE\n\nEstás dentro de mi entorno de desarrollo. Este es un espacio compartido para explorar mi trabajo.\nUsa "help" para ver los protocolos disponibles.\nPuedes navegar usando "cd" y "ls".',
      },
    },
  };
}

export function createEngine(data: TermData, fx: Effects) {
  const root = buildVfs(data);
  let cwd: string[] = [];

  const getNode = (path: string[]): VNode | null => {
    let c: VNode = root;
    for (const p of path) {
      if (c.children && c.children[p]) c = c.children[p];
      else return null;
    }
    return c;
  };

  const resolvePath = (current: string[], target: string): { path: string[]; node: VNode } | null => {
    if (!target) return { path: current, node: getNode(current)! };
    let parts: string[];
    if (target === '/' || target === '~') parts = [];
    else if (target.startsWith('/')) parts = target.split('/').filter(Boolean);
    else parts = [...current, ...target.split('/').filter(Boolean)];
    const res: string[] = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') res.pop();
      else res.push(part);
    }
    const node = getNode(res);
    return node ? { path: res, node } : null;
  };

  const pathStr = () => (cwd.length === 0 ? '/' : '/' + cwd.join('/'));

  const execute = (raw: string): Result => {
    const parts = raw.trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);
    const row = (c: string, d: string): Span[] => [...g(c.padEnd(12)), ['', ' '], ...o(d)];
    const isRoot = (a: string[]) => a.includes('-rf') && (a.includes('/') || a.includes('/*'));

    switch (cmd) {
      case 'help': {
        if (args.includes('-a')) {
          const secret = ['sudo', 'approve', 'hire-me', 'matrix', 'glitch', 'rm', 'rm -rf', 'regen module', 'top', 'coffee', 'ssh', 'stars'];
          const lines: Line[] = [[['b bd', '// PROTOCOLOS_CLASIFICADOS']], o(RULE)];
          let acc: Span[] = [];
          secret.forEach((c, i) => {
            acc.push(['b', c.padEnd(14)]);
            if ((i + 1) % 3 === 0) {
              lines.push(acc);
              acc = [];
            }
          });
          if (acc.length) lines.push(acc);
          lines.push(o(RULE));
          lines.push([['b', '●'], ['', ' '], ['f', '— Acceso restringido. Úsalo bajo tu propio riesgo.']]);
          return lines;
        }
        return [
          title('// PROTOCOLOS_DEL_SISTEMA_CORE'),
          o(RULE),
          row('ls', '— listar archivos/directorios (ls <ruta>)'),
          row('cd', '— cambiar directorio (cd <ruta>)'),
          row('cat', '— leer archivo (cat <ruta>)'),
          row('pwd', '— mostrar contexto de trabajo activo'),
          row('tree', '— mostrar estructura del sistema'),
          row('wget cv', '— descargar mi currículum'),
          row('scan', '— escanear integridad y módulos'),
          row('whoami', '— información de sesión'),
          row('neofetch', '— mostrar información del sistema'),
          row('clear', '— limpiar terminal'),
          row('exit', '— cerrar consola'),
          o(RULE),
          w('// PISTA: Usa "help -a" para la lista completa de protocolos.'),
        ];
      }
      case 'ls': {
        const target = args[0] || '.';
        const r = resolvePath(cwd, target);
        if (!r || r.node.type !== 'dir') return [e(`ls: no se puede acceder a '${target}': No existe el directorio`)];
        const line: Span[] = [];
        Object.keys(r.node.children || {}).forEach((name, i) => {
          if (i) line.push(['', '  ']);
          line.push(r.node.children![name].type === 'dir' ? ['bl', name + '/'] : ['', name]);
        });
        return [line];
      }
      case 'pwd': {
        const scope = cwd.length === 0 ? 'ROOT_ACCESS' : cwd[cwd.length - 1].toUpperCase();
        return [
          title('// CONTEXTO_DE_TRABAJO'),
          o(RULE),
          [...g('RUTA'.padEnd(12)), ['', ' ' + pathStr()]],
          [...g('ALCANCE'.padEnd(12)), ['', ' ' + scope]],
          [...g('SESIÓN'.padEnd(12)), ['', ' RECRUITER_SYNC']],
        ];
      }
      case 'cd': {
        const target = args[0] || '~';
        const r = resolvePath(cwd, target);
        if (r && r.node.type === 'dir') {
          cwd = r.path;
          return [];
        }
        return [e(`cd: no existe el directorio: ${target}`)];
      }
      case 'tree': {
        const walk = (dir: VNode, indent: string): Line[] => {
          let lines: Line[] = [];
          const names = Object.keys(dir.children || {}).sort();
          names.forEach((name, idx) => {
            const last = idx === names.length - 1;
            const item = dir.children![name];
            lines.push([['', indent + (last ? '└── ' : '├── ')], [item.type === 'dir' ? 'bl' : '', name]]);
            if (item.type === 'dir') lines = lines.concat(walk(item, indent + (last ? '    ' : '│   ')));
          });
          return lines;
        };
        return [b('/'), ...walk(root, '')];
      }
      case 'cat': {
        const target = args[0];
        if (!target) return [e('Uso: cat <ruta>')];
        const r = resolvePath(cwd, target);
        if (r && r.node.type === 'file') {
          if (target.includes('projects/') || (cwd.includes('projects') && target.endsWith('.project'))) {
            const fname = target.split('/').pop() || '';
            const p = data.projects.find((x) => projectFileName(x) === fname);
            if (p) fx.openProject(p.slug);
          }
          return (r.node.content || '').split('\n');
        }
        return [e(`cat: ${target}: No existe el archivo`)];
      }
      case 'log':
        return execute('cat /system/activity.log');
      case 'wget': {
        if (args[0] && args[0].includes('cv')) {
          fx.downloadCv();
          return [o('Conectando al almacenamiento core...'), b(`[STREAM] ${BAR}`), g('✓ Descarga iniciada. Revisa tu navegador.')];
        }
        return [e('wget: No encontrado.')];
      }
      case 'scan':
        return [
          g('[EJECUTANDO] ESCANEO_DE_RED...'),
          o('Verificando integridad VFS: [OK]'),
          o('Ping a módulos: Identidad [OK], Proyectos [OK], Tecnología [OK]'),
          w(`Tiempo de carga: ${performance.now().toFixed(2)}ms`),
          g('✓ Estado del sistema: OPTIMIZADO'),
        ];
      case 'regen': {
        if ((args[0] || '').toLowerCase() !== 'module' || args.length !== 1) return [e('Uso: regen module')];
        fx.restoreModules();
        return [g('[RECUPERACIÓN] PILA_DE_MÓDULOS_RESTAURADA')];
      }
      case 'glitch': {
        const active = fx.toggleGlitch();
        return [active ? w('[ADVERTENCIA] INESTABILIDAD_DEL_SISTEMA_DETECTADA') : g('[ÉXITO] Estabilidad del sistema restaurada.')];
      }
      case 'rm':
        if (isRoot(args)) return 'PURGE';
        return [e('Uso: rm <id-módulo> o rm -rf /')];
      case 'sudo':
        if (args[0] === 'rm' && isRoot(args)) return 'PURGE';
        return [w('[SEGURIDAD] Buen intento. Pero ya tienes acceso GUEST_ROOT. Confiamos en nuestros reclutadores.')];
      case 'approve':
        fx.openMail();
        return [g('[PROCESO] Candidato aprobado.'), o('Iniciando secuencia de onboarding...'), w('→ Redirección al enlace de contacto iniciada.')];
      case 'whoami':
        return [
          g('{'),
          g('  "sesión": "INVITADO_RECLUTADOR",'),
          g(`  "anfitrión": "${data.identity.name.replace('\n', ' ')}",`),
          g('  "nivel_acceso": "GUEST_ROOT",'),
          g('  "mensaje": "Bienvenido a mi core. Ahora eres parte del sistema."'),
          g('}'),
        ];
      case 'matrix':
        fx.pulseGlitch();
        return [w('Inicializando glitch visual...'), g('01010101 10101010 01100110')];
      case 'clear':
        return 'CLEAR';
      case 'exit':
        fx.closeTerminal();
        return [];
      case 'neofetch': {
        const ua = navigator.userAgent;
        const browser = ua.includes('Firefox') ? 'Firefox' : ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : 'Unknown';
        const os = ua.includes('Win') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Unknown';
        return [
          '',
          g('    recruiter@shared-core'),
          g('    ─────────────────────────────'),
          o(`    OS:      ${os}`),
          o('    Shell:   Core-sh 4.2'),
          o(`    Browser: ${browser}`),
          o('    Editor:  LazyVim'),
          w('    Estado:  Abierto a nuevos desafíos'),
          '',
        ];
      }
      case 'top': {
        const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
        const mem = perf.memory ? `${Math.round(perf.memory.usedJSHeapSize / 1048576)}MB` : 'N/A';
        return [
          o('Tareas: 12 ejecutándose, 248 ideas pendientes'),
          w(`Memoria: ${mem} coffee-powered`),
          '',
          o('PID    COMANDO        CPU%    MEM'),
          o('─────────────────────────────────'),
          w('1337   demonio_café   42.0    128M'),
          o('2048   proyectos_secundarios  15.2    512M'),
          e('4096   impostor_syn   0.0     0.0M (Disabled)'),
          o('8192   ojo_reclutador 100.0   64M'),
        ];
      }
      case 'coffee':
        return [o('☕ ESTADO DEL CAFÉ:'), g('  Nivel: CRÍTICO'), o('Preparando más conocimiento especializado para nuestro encuentro...')];
      case 'ssh':
        return [o('Conectando al puente de reclutador...'), w('RSA: AlejandroMP/EnlaceReclutador'), g('→ Acceso concedido. Handshake completado. Bienvenido, socio.')];
      case 'stars':
        return [g(`[ESTADÍSTICAS] Impacto Total de Proyectos (Estrellas GitHub): ${data.projects.reduce((n, p) => n + p.stars, 0)}`)];
      case 'hire-me':
        fx.highlightContact();
        return [
          g('Inicializando secuencia de contratación...'),
          o(BAR),
          g('✓ Verificación de antecedentes superada'),
          w(`→ Línea directa: ${data.email}`),
          g('Listo para unirse a tu equipo. Módulo de contacto resaltado.'),
        ];
      default:
        return [e(`${cmd}: comando no encontrado`)];
    }
  };

  // Autocompletado: devuelve el nuevo valor del input (o el mismo si no hay coincidencia).
  const complete = (value: string): string => {
    const parts = value.trimStart().split(/\s+/);
    const last = (parts[parts.length - 1] || '').toLowerCase();
    const common = (xs: string[]) => xs.reduce((a, x) => { let i = 0; while (i < a.length && i < x.length && a[i].toLowerCase() === x[i].toLowerCase()) i++; return a.slice(0, i); });
    if (parts.length === 1 && !value.includes(' ')) {
      const ms = COMMAND_LIST.filter((c) => c.startsWith(last));
      if (ms.length === 1) return ms[0] + ' ';
      if (ms.length > 1) return common(ms);
      return value;
    }
    const pp = last.split('/');
    const search = pp.pop() || '';
    const dirStr = pp.join('/');
    const r = resolvePath(cwd, dirStr || (last.startsWith('/') ? '/' : '.'));
    if (!r || r.node.type !== 'dir') return value;
    const kids = r.node.children || {};
    const ms = Object.keys(kids).filter((c) => c.toLowerCase().startsWith(search.toLowerCase()));
    const base = value.slice(0, value.length - search.length);
    if (ms.length === 1) return base + ms[0] + (kids[ms[0]].type === 'dir' ? '/' : ' ');
    if (ms.length > 1) return base + common(ms);
    return value;
  };

  const purgeFiles = (): string[] => [
    ...data.projects.map((p) => `/projects/${projectFileName(p)}`),
    '/about/identity.json', '/about/stack.json', '/system/kernel.log', '/system/env.local',
    '/README.md', '/usr/bin/neofetch', '/usr/bin/top', '/etc/shadow',
  ];

  return { execute, complete, pathStr, purgeFiles };
}
