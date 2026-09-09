import { useArtifactStore } from '@/store/artifactStore';
import styles from './Artifact.module.css';
import { useThreadStore } from '@/store/threadStore';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSidebarStore } from '@/store/sidebarStore';

const Artifact = ({ artifactId, subtype, data }) => {
  const setIsArtifactOpen = useThreadStore((s) => s.setIsArtifactOpen);
  const isSidebarOpen = useSidebarStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useSidebarStore((s) => s.setIsSidebarOpen);
  const setMobileTab = useThreadStore((s) => s.setMobileTab);

  const setArtifactId = useArtifactStore((s) => s.setArtifactId);

  const handleArtifactOpen = () => {
    setIsArtifactOpen(true);
    setArtifactId(artifactId);
    // setArtifactType(subtype)
    // setArtifactData(data);
    setMobileTab('canvas');
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };
  return (
    <>
      {subtype === 'roadmap' && (
        <RoadmapArtifact data={data} onOpen={handleArtifactOpen} />
      )}
    </>
  );
};

const RoadmapArtifact = ({ data, onOpen }) => {
  return (
    <div className={styles['main-ct']}>
      <div className={styles['af-left']}>
        <div className={styles['icon']}>
          <RoadmapIcon />
        </div>
        <div className={styles['title-ct']}>
          <span className={styles['af-title']}>{data?.name || 'Roadmap'}</span>

          <span
            className={styles['af-version']}
          >{`Version ${String(data?.version?.version_tag + 1).padStart(2, '0')}`}</span>
        </div>
      </div>
      <div className={styles['af-right']}>
        <button className={styles['cta-btn']} onClick={onOpen}>
          Open Roadmap
        </button>
      </div>
    </div>
  );
};

const RoadmapIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <rect width="8" height="8" x="3" y="3" rx="2" />
        <path d="M7 11v4a2 2 0 0 0 2 2h4" />
        <rect width="8" height="8" x="13" y="13" rx="2" />
      </g>
    </svg>
  );
};

export default Artifact;
