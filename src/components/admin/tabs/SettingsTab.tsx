import React, { useState, useEffect, useCallback } from 'react';
import type { SiteSettings } from '../../../types';
import { 
  inputClass, 
  buttonPrimaryClass, 
  buttonSecondaryClass, 
  cardClass, 
  Field, 
  SectionHeader 
} from '../components/UI';

interface SettingsTabProps {
  onLog: (msg: string) => void;
}

export default function SettingsTab({ onLog }: SettingsTabProps) {
  const [settings, setSettings] = useState<SiteSettings>({ 
    availabilityValue: 100, 
    status: 'ONLINE', 
    logLimit: 10, 
    cvUrl: '',
    linkedinUrl: '',
    bio: '',
    photoUrl: '/profile.jpg',
    dustThresholdDays: 60,
    starsForGold: 5
  });
  const [cvLoading, setCvLoading] = useState(false);

  const load = useCallback(async () => {
    const stored = localStorage.getItem('portfolioSettings');
    if (stored) {
      setSettings(JSON.parse(stored));
      return;
    }
    try {
      const res = await fetch('/data/settings.json');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.warn('Settings load: JSON fallback');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(partial: Partial<SiteSettings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    localStorage.setItem('portfolioSettings', JSON.stringify(next));
    onLog(`PARAM_MODIFIED: ${Object.keys(partial)[0].toUpperCase()}`);
  }

  async function uploadCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setCvLoading(true); onLog('UPLOADING_CV...');
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve) => { 
        reader.onload = () => resolve((reader.result as string).split(',')[1]); 
        reader.readAsDataURL(file); 
      });
      const res = await fetch('/api/github', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: 'uploadCv', base64: b64 }) 
      });
      if (!res.ok) throw new Error('API_REJECTED');
      update({ cvUrl: '/cv.pdf' }); 
      onLog('CV_UPLOAD_SUCCESS');
    } catch (e: any) { 
      onLog(`CV_UPLOAD_ERROR: ${e.message}`); 
    } finally { 
      setCvLoading(false); 
    }
  }

  return (
    <div className="flex flex-col gap-10 font-mono">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Master Controls */}
        <div className={cardClass}>
          <SectionHeader title="MASTER_CONTROLS" />
          <div className="space-y-6">
            <Field label={`AVAILABILITY: ${settings.availabilityValue}%`}>
              <div className="flex items-center gap-4 py-2">
                <input 
                  type="range" 
                  min={0} 
                  max={100} 
                  step={0.1} 
                  value={settings.availabilityValue} 
                  onChange={e => update({ availabilityValue: Number(e.target.value) })} 
                  className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-sky-500 border border-zinc-800" 
                />
              </div>
            </Field>
            
            <Field label="SYSTEM_STATUS">
              <select 
                value={settings.status} 
                onChange={e => update({ status: e.target.value as any })} 
                className={inputClass}
              >
                <option value="ONLINE">ONLINE</option>
                <option value="BUSY">BUSY</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>
            </Field>

            <Field label="LOG_LIMIT">
              <input 
                type="number" 
                value={settings.logLimit ?? 10} 
                onChange={e => update({ logLimit: Number(e.target.value) })} 
                className={inputClass} 
              />
            </Field>
          </div>
        </div>

        {/* Engine Parameters */}
        <div className={cardClass}>
          <SectionHeader title="ENGINE_PARAMS" />
          <div className="space-y-6">
            <Field label={`DUST_THRESHOLD: ${settings.dustThresholdDays} DAYS`}>
              <div className="flex items-center gap-4 py-2">
                <input 
                  type="range" 
                  min={7} 
                  max={365} 
                  value={settings.dustThresholdDays} 
                  onChange={e => update({ dustThresholdDays: Number(e.target.value) })} 
                  className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-zinc-800" 
                />
              </div>
            </Field>

            <Field label={`GOLD_REQUIREMENT: ${settings.starsForGold} STARS`}>
              <div className="flex items-center gap-4 py-2">
                <input 
                  type="range" 
                  min={0} 
                  max={50} 
                  value={settings.starsForGold} 
                  onChange={e => update({ starsForGold: Number(e.target.value) })} 
                  className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-yellow-400 border border-zinc-800" 
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Recruiter / Profile Settings */}
        <div className={`${cardClass} md:col-span-2`}>
          <SectionHeader title="RECRUITER_&_PROFILE_UPLINK" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6 md:col-span-2">
              <Field label="BIO (Recruiter/About layout)">
                <textarea 
                  value={settings.bio ?? ''} 
                  onChange={e => update({ bio: e.target.value })} 
                  className={`${inputClass} h-28 resize-none`} 
                  placeholder="Insert professional bio text..."
                />
              </Field>
            </div>
            
            <Field label="PHOTO URL">
              <input 
                value={settings.photoUrl ?? ''} 
                onChange={e => update({ photoUrl: e.target.value })} 
                className={inputClass} 
                placeholder="/profile.jpg"
              />
            </Field>

            <Field label="LINKEDIN URL">
              <input 
                value={settings.linkedinUrl ?? ''} 
                onChange={e => update({ linkedinUrl: e.target.value })} 
                className={inputClass} 
                placeholder="https://www.linkedin.com/in/..."
              />
            </Field>
          </div>
        </div>

        {/* Assets & Cache */}
        <div className={`${cardClass} md:col-span-2`}>
          <SectionHeader title="ASSETS_&_CACHE" />
          <div className="space-y-6">
            <Field label="CV_ENDPOINT">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input 
                  value={settings.cvUrl ?? ''} 
                  onChange={e => update({ cvUrl: e.target.value })}
                  className={`${inputClass} flex-1`} 
                  placeholder="/cv.pdf"
                />
                <input type="file" onChange={uploadCv} className="hidden" id="cv-up" />
                <label 
                  htmlFor="cv-up" 
                  className={`${buttonSecondaryClass} w-full sm:w-auto text-center cursor-pointer`}
                >
                  {cvLoading ? '...' : 'UPLOAD_PDF'}
                </label>
              </div>
            </Field>
            
            <div className="pt-6 border-t border-zinc-800 flex justify-between items-center">
              <button 
                onClick={() => { 
                  if (confirm('Are you sure you want to reset all local changes? This will reload settings from original files.')) { 
                    localStorage.removeItem('portfolioSettings'); 
                    load(); 
                    onLog('SETTINGS_RELOADED_FROM_DISK');
                  } 
                }} 
                className="text-xs text-zinc-500 hover:text-zinc-300 font-bold uppercase transition-colors"
              >
                Reload from Disk
              </button>

              <button 
                onClick={() => { 
                  if (confirm('FACTORY_RESET? This will clear ALL modifications stored in local cache.')) { 
                    localStorage.clear(); 
                    window.location.reload(); 
                  } 
                }} 
                className="px-6 py-2.5 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase hover:bg-red-950/20 rounded-xl tracking-widest transition-all duration-200"
              >
                FACTORY_RESET_CACHE
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
