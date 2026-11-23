import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { banner, createEngine, welcome } from './engine';
import type { Effects, Line, TermData } from './engine';
import styles from './DevTerminal.module.css';

interface Props {
  data: TermData;
}

interface OutLine {
  id: number;
  line: Line;
}

const CHIPS = ['help', 'whoami', 'ls projects', 'neofetch', 'log', 'hire-me'];
const MAX_LINES = 500;
// Orden en el que "rm -rf /" hace desaparecer los módulos de la página.
const COLLAPSE: Record<number, string> = { 0: 'proyectos', 2: 'open-source', 3: 'whoami', 6: 'stack', 9: 'roadmap' };

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced() ? Math.min(ms, 30) : ms));
const moduleEl = (name: string) => document.querySelector<HTMLElement>(`[data-module="${name}"]`);
const flash = (el: Element, cls: string, ms: number) => {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
};

export default function DevTerminal({ data }: Props) {
  const idRef = useRef(0);
  const wrap = (lines: Line[]): OutLine[] => lines.map((line) => ({ id: idRef.current++, line }));
  const [lines, setLines] = useState<OutLine[]>(() => wrap(welcome()));
  const [path, setPath] = useState('/');
  const [closed, setClosed] = useState(false);
  const [value, setValue] = useState('');
  const busy = useRef(false);
  const hist = useRef<string[]>([]);
  const hi = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const focusOnClose = useRef(false);

  const print = useCallback((ls: Line[]) => {
    if (!ls.length) return;
    setLines((prev) => [...prev, ...wrap(ls)].slice(-MAX_LINES));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fx: Effects = useMemo(
    () => ({
      openProject: (slug) => {
        const el = document.getElementById('repo-' + slug);
        if (!el) return;
        el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
        flash(el, 'hl', 1500);
      },
      downloadCv: () => {
        const url = data.cvUrl || '/cv.pdf';
        fetch(url)
          .then((r) => {
            if (!r.ok) throw new Error('cv');
            return r.blob();
          })
          .then((blob) => {
            const obj = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = obj;
            a.download = 'Alejandro-CV.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(obj), 1000);
          })
          .catch(() => window.open(url, '_blank'));
      },
      openMail: () => {
        const subject = encodeURIComponent('Aprobación del sistema Core - AlejandroMP');
        const body = encodeURIComponent('Hola Alejandro, he revisado tu sistema Core y me gustaría seguir adelante con tu candidatura.');
        setTimeout(() => {
          window.location.href = `mailto:${data.email}?subject=${subject}&body=${body}`;
        }, 2000);
      },
      highlightContact: () => {
        const el = document.getElementById('mailcmd');
        if (el) flash(el, 'pulse', 5000);
      },
      toggleGlitch: () => document.body.classList.toggle('dev-glitch'),
      pulseGlitch: () => {
        if (reduced()) return;
        document.body.classList.add('dev-glitch');
        setTimeout(() => document.body.classList.remove('dev-glitch'), 2000);
      },
      restoreModules: () => {
        document.querySelectorAll('[data-module]').forEach((el) => el.classList.remove('gone'));
      },
      closeTerminal: () => {
        focusOnClose.current = true;
        setClosed(true);
      },
    }),
    [data],
  );

  const engine = useMemo(() => createEngine(data, fx), [data, fx]);
  const prompt = `alejandro@${data.host}:${path}$`;

  const purge = async () => {
    busy.current = true;
    const files = engine.purgeFiles();
    for (let i = 0; i < files.length; i++) {
      print([[['e', `DELETING: ${files[i]} ... DONE`]]]);
      if (COLLAPSE[i]) moduleEl(COLLAPSE[i])?.classList.add('gone');
      await sleep(150);
    }
    print([[['e bd', '[FATAL] SYSTEM_CORE_DELETED']], [['f', 'Pista: ejecuta "regen module" para restaurar los módulos.']]]);
    busy.current = false;
  };

  const run = async (raw: string) => {
    if (busy.current) return;
    print([[['ok', prompt + ' '], ['c', raw]]]);
    if (!raw.trim()) return;
    hist.current.push(raw);
    if (hist.current.length > 50) hist.current.shift();
    hi.current = hist.current.length;
    const r = engine.execute(raw);
    setPath(engine.pathStr());
    if (r === 'PURGE') await purge();
    else if (r === 'CLEAR') setLines(wrap(banner()));
    else print(r);
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    const k = ev.key;
    if (k === 'Enter' && !ev.nativeEvent.isComposing) {
      ev.preventDefault();
      const v = value;
      setValue('');
      void run(v);
    } else if (k === 'ArrowUp') {
      ev.preventDefault();
      if (hi.current > 0) setValue(hist.current[--hi.current]);
    } else if (k === 'ArrowDown') {
      ev.preventDefault();
      hi.current = Math.min(hist.current.length, hi.current + 1);
      setValue(hist.current[hi.current] || '');
    } else if (k === 'Tab') {
      ev.preventDefault();
      setValue(engine.complete(value));
    }
  };

  useEffect(() => {
    const s = screenRef.current;
    if (s) s.scrollTop = s.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (closed && focusOnClose.current) reopenRef.current?.focus();
  }, [closed]);

  const reopen = () => {
    setClosed(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cls = (c: string) => c.split(' ').filter(Boolean).map((x) => styles[x] || '').join(' ');

  return (
    <div className={styles.term}>
      {closed ? (
        <div className={styles.reopen}>
          <button type="button" ref={reopenRef} onClick={reopen}>
            ▸ reabrir terminal
          </button>
        </div>
      ) : (
        <>
          <div
            className={styles.screen}
            ref={screenRef}
            onClick={() => {
              if (!String(window.getSelection())) inputRef.current?.focus();
            }}
          >
            <div className={styles.out} role="log" aria-live="polite" aria-label="Salida de la terminal">
              {lines.map(({ id, line }) => (
                <div key={id}>
                  {typeof line === 'string' ? line : line.map(([c, t], i) => <span key={i} className={cls(c)}>{t}</span>)}
                </div>
              ))}
            </div>
            <div className={styles.line} role="group" aria-label="Línea de comandos">
              <label htmlFor="dev-term-input" className={styles.ps}>
                {prompt}
              </label>
              <input
                id="dev-term-input"
                ref={inputRef}
                className={styles.input}
                name="cmd"
                value={value}
                onChange={(ev) => setValue(ev.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-label="Comando"
              />
            </div>
          </div>
          <div className={styles.chips} role="group" aria-label="Comandos rápidos">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  void run(c);
                  inputRef.current?.focus();
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
