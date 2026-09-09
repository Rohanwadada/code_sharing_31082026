'use client';

import React from 'react';
import styles from './RoadmapEditor.module.css';
import EditorCanvas from './EditorCanvas';
import Sidebar from './sidebar/Sidebar';
import backIcon from '@/assets/back.svg';
import desktopIcon from '@/assets/desktop-icon.svg';
import EditorCanvasHeader from './EditorCanvasHeader';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import Link from 'next/link';
import Image from 'next/image';

/**
 * RoadmapEditor Component
 *
 * This component serves as the main container for the roadmap editing interface.
 * It includes a header, a sidebar, and an editor canvas for drawing.
 * It also restricts editing on smaller screens for a better user experience.
 *
 * @component
 * @returns {JSX.Element} The rendered RoadmapEditor component.
 */
const RoadmapEditor = ({ roadmapId }) => {
  // Get window width and height using a custom hook
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  return (
    <>
      {/* If screen width is less than 768px, show a message blocking access */}
      {windowWidth < 768 ? (
        <div className={styles['page-edit-blocker']}>
          <Link href={'/'}>
            <Image src={backIcon} alt="" className={styles['page-back-icon']} />
          </Link>

          <Image
            src={desktopIcon}
            alt="Desktop Icon"
            className={styles['desktop-icon']}
          />
          <div>Switch to larger devices to draw</div>
        </div>
      ) : (
        <>
          {/* Header component - Fixed at the top */}
          <EditorCanvasHeader roadmapId={roadmapId} />
          <div className={styles['main-container']}>
            {/* Sidebar component - Contains tools for roadmap editing */}
            <Sidebar />

            {/* Main roadmap editing canvas */}
            <div className={styles['roadmap-canvas']}>
              <EditorCanvas roadmapId={roadmapId} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default RoadmapEditor;
