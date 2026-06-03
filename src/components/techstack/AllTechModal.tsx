import React from 'react';
import type { TechTool } from '../../types';
import ProgressBar from '../ui/ProgressBar';

interface AllTechModalProps {
  tools: TechTool[];
  onClose: () => void;
}

export default function AllTechModal({ tools, onClose }: AllTechModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="border border-white/15 bg-carbono-surface w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white tracking-widest">TECH_MATRIX</span>
            <span className="text-xs text-text-faint tracking-widest">({tools.length} tools)</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-text-faint hover:text-white tracking-widest border border-white/15 px-2 py-1 hover:border-white/40 transition-colors"
          >
            [ESC]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/15 bg-carbono sticky top-0">
                <th className="text-left px-4 py-2.5 text-text-faint tracking-widest uppercase font-normal text-sm">Language / Tool</th>
                <th className="text-left px-4 py-2.5 text-text-faint tracking-widest uppercase font-normal text-sm">Version</th>
                <th className="text-left px-4 py-2.5 text-text-faint tracking-widest uppercase font-normal text-sm">Usage Level</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool, i) => (
                <tr
                  key={tool.name}
                  className={`border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors ${i % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}
                >
                  <td className="px-4 py-2.5 text-white tracking-widest uppercase text-sm">{tool.name}</td>
                  <td className="px-4 py-2.5 text-text-muted tracking-widest text-sm">{tool.version}</td>
                  <td className="px-4 py-2.5">
                    <ProgressBar value={tool.usageLevel} segments={10} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
