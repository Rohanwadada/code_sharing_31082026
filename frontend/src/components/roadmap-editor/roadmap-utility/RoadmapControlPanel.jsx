import React, { useContext, useEffect, useRef } from 'react';
import zoomInIcon from '@/assets/roadmap-control-panel/zoom-in.svg';
import zoomOutIcon from '@/assets/roadmap-control-panel/zoom-out.svg';
import styles from './RoadmapControlPanel.module.css';
import { emitCustomEvent } from '@/utils/helper';
import { RoadmapContext } from '@/context/RoadmapContext';
import { useReactFlow } from '@xyflow/react';
import { useRoadmapEditorSidebarStore } from '@/store/roadmapEditorSidebarStore';
import Image from 'next/image';

/**
 *
 * @description This component is used to render the control panel for the roadmap. It contains buttons for zooming in and out, previewing the roadmap, publishing the roadmap, and showing properties.
 * @returns {JSX.Element}
 * @component
 * @example
 * return (<RoadmapControlPanel />)
 */
const RoadmapControlPanel = ({ roadmapId }) => {
  const activeSection = useRoadmapEditorSidebarStore((s) => s.activeSection);
  const activeSectionWidth = useRoadmapEditorSidebarStore(
    (s) => s.activeSectionWidth,
  );

  const {
    roadmapVisibility,
    setRoadmapVisibility,
    roadmapStatus,
    setRoadmapSatus,
  } = useContext(RoadmapContext);
  const { zoomIn, zoomOut } = useReactFlow();
  const roadmpaControlPanelRef = useRef(null);

  const handleZoomIn = () => {
    zoomIn({ duration: 300 });
  };
  const handleZoomOut = () => {
    zoomOut({ duration: 300 });
  };

  const handlePreviewButtonClick = () => {
    window.open(`/preview/${roadmapId}`, '_blank');
  };

  const handleRoadmapPublish = () => {
    const newVisibility = roadmapVisibility === 'public' ? 'private' : 'public';
    const newStatus = roadmapStatus === 'draft' ? 'published' : 'draft';
    setRoadmapVisibility(newVisibility);
    setRoadmapSatus(newStatus);
    emitCustomEvent('roadmap::update', {
      visibility_scope: newVisibility,
      status: newStatus,
      change: 'visibility',
    });
  };

  useEffect(() => {
    if (activeSection && roadmpaControlPanelRef.current) {
      roadmpaControlPanelRef.current.style.left = `calc(80px + ${activeSectionWidth}px)`;
    } else {
      roadmpaControlPanelRef.current.style.left = 'calc(80px)';
    }
  }, [activeSection]);

  return (
    <>
      <div className={styles['zoom-control']} ref={roadmpaControlPanelRef}>
        <Image
          src={zoomInIcon}
          alt=""
          title="zoom-in"
          className={styles['zoom-in']}
          onClick={handleZoomIn}
        />
        <Image
          src={zoomOutIcon}
          alt=""
          title="zoom-out"
          className={styles['zoom-out']}
          onClick={handleZoomOut}
        />
      </div>
    </>
  );
};

export default RoadmapControlPanel;
