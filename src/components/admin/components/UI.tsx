import React from 'react';

export const inputClass = "bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 text-xs font-mono rounded-xl px-4 py-3 w-full focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all duration-200";

export const buttonPrimaryClass = "bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-mono text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonSecondaryClass = "border border-zinc-800 hover:border-zinc-700 bg-zinc-900/20 text-zinc-300 font-mono text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-xl hover:text-white transition-all duration-200 disabled:opacity-50";

export const cardClass = "bg-zinc-900/40 border border-zinc-800/80 p-6 sm:p-8 rounded-2xl shadow-xl hover:border-zinc-700/50 transition-all duration-300 relative overflow-hidden group";

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-zinc-400 font-bold font-mono tracking-widest uppercase flex items-center gap-1">
        {label}
        {required && <span className="text-sky-400 font-sans">*</span>}
      </label>
      {children}
    </div>
  );
}

export function CheckField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group py-1.5 font-mono">
      <div className={`w-4 h-4 border rounded-md ${
        value 
          ? 'bg-sky-500 border-sky-500 text-zinc-950 shadow-[0_0_12px_rgba(56,189,248,0.4)]' 
          : 'border-zinc-800 bg-zinc-950 group-hover:border-zinc-700'
      } transition-all duration-200 flex items-center justify-center`}>
        {value && (
          <svg className="w-2.5 h-2.5 stroke-zinc-950 stroke-[3px] fill-none" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="hidden" />
      <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
    </label>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <h3 className="text-xs font-bold text-zinc-200 font-mono tracking-widest uppercase">{title}</h3>
      <div className="h-[2px] w-full bg-gradient-to-r from-sky-500/30 via-zinc-800/40 to-transparent" />
    </div>
  );
}
