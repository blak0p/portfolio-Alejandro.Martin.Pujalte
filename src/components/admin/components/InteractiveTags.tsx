import React, { useState, KeyboardEvent } from 'react';

interface InteractiveTagsProps {
  value: string; // comma-separated values
  onChange: (value: string) => void;
  placeholder?: string;
}

export function InteractiveTags({ value, onChange, placeholder = "Add tag..." }: InteractiveTagsProps) {
  const [inputValue, setInputValue] = useState('');

  // Split tags cleanly, filtering out empty entries
  const tags = value
    ? value.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const addTag = (tagText: string) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;
    
    // Prevent duplicates case-insensitively, but store as entered
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }

    const updatedTags = [...tags, trimmed];
    onChange(updatedTags.join(', '));
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    const updatedTags = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(updatedTags.join(', '));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full font-mono">
      <div className="flex flex-wrap gap-2 p-2 min-h-12 bg-zinc-950 border border-zinc-800 rounded-xl items-center focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/20 transition-all duration-200">
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700/80 rounded-lg text-xs font-bold text-zinc-300 transition-all"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="text-zinc-500 hover:text-red-400 font-bold transition-colors w-4 h-4 flex items-center justify-center rounded"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none py-1"
        />
      </div>
    </div>
  );
}
