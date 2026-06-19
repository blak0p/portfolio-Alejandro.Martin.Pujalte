import React from 'react';

interface ProfilePhotoProps {
  src?: string;
  alt?: string;
  size?: number;
}

export default function ProfilePhoto({ src, alt = 'blak0p', size = 96 }: ProfilePhotoProps) {
  const [error, setError] = React.useState(false);

  return (
    <div
      className="relative border border-white/80 overflow-hidden shrink-0 bg-carbono-surface flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: '50%' }}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="text-xs text-text-faint tracking-widest">NO_SIGNAL</span>
      )}
    </div>
  );
}
