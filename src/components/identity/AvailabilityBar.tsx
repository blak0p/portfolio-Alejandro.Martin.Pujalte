import React, { useState, useEffect } from 'react';
import ProgressBar from '../ui/ProgressBar';

interface AvailabilityBarProps {
  value?: number;
}

const STATUS_LABELS: Record<string, string> = {
  ONLINE: 'Sistema_Listo',
  BUSY: 'Sistema_Ocupado',
  OFFLINE: 'Sistema_Mantenimiento',
};

export default function AvailabilityBar({ value = 99.9 }: AvailabilityBarProps) {
  const [availabilityValue, setAvailabilityValue] = useState(value);
  const [status, setStatus] = useState('ONLINE');

  useEffect(() => {
    const load = () => {
      try {
        const s = localStorage.getItem('portfolioSettings');
        if (s) {
          const settings = JSON.parse(s);
          setAvailabilityValue(settings.availabilityValue ?? value);
          setStatus(settings.status ?? 'ONLINE');
        }
      } catch {}
    };
    load();
    window.addEventListener('portfolioSettingsChanged', load);
    return () => window.removeEventListener('portfolioSettingsChanged', load);
  }, [value]);

  const label = STATUS_LABELS[status] ?? 'Sistema_Listo';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-faint tracking-widest uppercase">{label}</span>
        <span className="text-xs text-cobalt tracking-widest font-bold">{availabilityValue}%</span>
      </div>
      <ProgressBar value={availabilityValue} segments={10} className="w-full" />
    </div>
  );
}