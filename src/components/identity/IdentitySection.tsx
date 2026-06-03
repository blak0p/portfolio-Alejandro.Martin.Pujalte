import React, { useState, useEffect } from 'react';
import AvailabilityBar from './AvailabilityBar';
import ContactButton from './ContactButton';
import Pill from '../ui/Pill';

interface IdentityProps {
  name: string;
  handle: string;
  bio: string;
  quote?: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  availabilityValue?: number;
  cvUrl?: string;
  linkedinUrl?: string;
  contactEmail?: string;
  birthDate?: string;
  links?: { label: string; href: string }[];
}

export default function IdentitySection({ name, handle, bio, quote, status, availabilityValue, cvUrl, linkedinUrl, contactEmail, birthDate, links = [] }: IdentityProps) {
  const [imgError, setImgError] = React.useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (birthDate) {
      const birth = new Date(birthDate);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) calculatedAge--;
        setAge(calculatedAge);
      }
    }
  }, [birthDate]);

  const forceDownload = (url: string, filename: string) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      })
      .catch(err => {
        console.error("Download failed", err);
        window.open(url, '_blank');
      });
  };

  if (!isMounted) return <div className="h-40 animate-pulse bg-white/5 rounded-2xl" />;

  return (
    <section data-section="identity" className="flex flex-col h-full bg-transparent">
      {/* CABEZAL: FOTO PEQUEÑA Y ELEGANTE */}
      <div className="relative w-full h-40 sm:h-48 overflow-hidden border-b border-white/5 bg-black/20">
        {!imgError ? (
          <img
            src="/profile.jpg"
            alt={name}
            className="w-full h-full object-cover object-center transition-transform duration-1000 hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-white/20 uppercase tracking-widest">NO_SIGNAL</div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0c10] via-transparent to-transparent pointer-events-none" />
        
        <div className="absolute bottom-0 left-0 w-full p-5 flex flex-col">
          <Pill variant="cobalt" className="text-xs font-black mb-2 bg-cobalt text-white w-fit">{status}</Pill>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-none">
            {name.replace('\n', ' ')}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-cobalt tracking-[0.3em] uppercase font-black opacity-80">{handle}</span>
            {age !== null && <span className="text-sm font-black text-white/70">{age}y</span>}
          </div>
        </div>
      </div>

      {/* BIO Y ACCIONES VERTICALES */}
      <div className="p-5 flex flex-col gap-6">
        <p className="text-sm text-text-muted leading-relaxed font-medium italic opacity-70 pl-3 border-l border-white/15">
          {bio}
        </p>

        <div className="space-y-6">
          <AvailabilityBar value={availabilityValue} />
          
          <div className="flex flex-col gap-2">
            <ContactButton href={contactEmail ? `mailto:${contactEmail}` : undefined} />

            {cvUrl && (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => forceDownload(cvUrl, 'Alejandro-CV.pdf')}
                  className="w-full bg-cobalt text-white text-sm font-black tracking-[0.2em] uppercase px-4 py-3 hover:bg-blue-500 transition-all duration-150 active:scale-[0.98] shadow-lg border border-white/15"
                >
                  ↓ DOWNLOAD CV (EN)
                </button>
                <p className="text-xs text-white/50 tracking-widest uppercase text-center font-bold">
                  // CV — Work experience and history
                </p>
              </div>
            )}

            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-white/5 border border-white/15 text-white/70 text-center text-sm font-black tracking-[0.2em] uppercase px-4 py-3 hover:bg-[#0077B5] hover:text-white transition-all duration-150 active:scale-[0.98]">
                LINKEDIN
              </a>
            )}

            {links.map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="w-full border border-white/15 bg-white/[0.06] text-white/70 text-center text-sm font-black tracking-[0.2em] uppercase px-4 py-3 hover:bg-white/10 hover:text-white transition-all duration-150 active:scale-[0.98]">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
