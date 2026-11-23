import React from 'react';
import IdentitySection from '../identity/IdentitySection';
import ProjectGrid from '../deployments/ProjectGrid';
import TechMatrix from '../techstack/TechMatrix';
import CoreConsole from '../terminal/CoreConsole';
import Roadmap from '../ambitions/Roadmap';
import CoreMasonry from './CoreMasonry';
import type { Project, TechTool, Ambition, LogEntry } from '../../types';

interface CoreHomeProps {
  identityData: any;
  projects: Project[];
  techStack: TechTool[];
  ambitions: Ambition[];
  logs: LogEntry[];
  logLimit: number;
  settings: any;
}

export default function CoreHome(props: CoreHomeProps) {
  const { identityData, projects, techStack, ambitions, logs, logLimit, settings } = props;
  
  const masonryItems = [
    { id: 'identity', component: <IdentitySection {...identityData} /> },
    {
      id: 'logs',
      component: (
        <CoreConsole
          logs={logs}
          logLimit={logLimit}
          projects={projects}
          settings={settings}
          identity={identityData}
          techStack={techStack}
        />
      ),
    },
    { id: 'projects', component: <ProjectGrid projects={projects} /> },
    { id: 'tech', component: <TechMatrix tools={techStack} /> },
    { id: 'roadmap', component: <Roadmap ambitions={ambitions} /> }
  ];

  return <CoreMasonry {...props} items={masonryItems} />;
}
