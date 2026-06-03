import React from 'react';

interface EmptyStateProps {
  message: string;
  className?: string;
}

export default function EmptyState({ message, className = "" }: EmptyStateProps) {
  return (
    <div className={`border border-white/15 bg-carbono-surface p-12 text-center island-load rounded-lg flex items-center justify-center min-h-[200px] w-full ${className}`}>
      <div className="flex flex-col gap-3 items-center">
        <div className="w-1.5 h-1.5 bg-cobalt/40 animate-pulse rounded-full" />
        <span className="text-sm sm:text-base text-text-faint tracking-[0.3em] font-black uppercase opacity-60">
          // {message}
        </span>
      </div>
    </div>
  );
}
