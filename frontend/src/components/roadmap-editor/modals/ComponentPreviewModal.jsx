import styles from './ComponentPreviewModal.module.css';
import zoomInIcon from '@/assets/roadmap-control-panel/zoom-in.svg';
import zoomOutIcon from '@/assets/roadmap-control-panel/zoom-out.svg';
import closeIcon from '@/assets/close.svg';
import { useContext, useState } from 'react';
import { RoadmapContext } from '@/context/RoadmapContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import RoadmapSVGViewer from '@/components/roadmap/RoadmapSVGViewer';
import EdgeMarkers from '../../shared/EdgeMarkers';

// Animation Variants
const modalVariants = {
  hidden: {
    x: '100%',
    zIndex: 1,
    transition: {
      type: 'tween',
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
  visible: {
    x: 0,
    zIndex: 1,
    transition: {
      type: 'tween',
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const ComponentPreviewModal = () => {
  const { selectedComponent, setSelectedComponent } =
    useContext(RoadmapContext);

  const MAX_ZOOM_LEVEL = 5;
  const MIN_ZOOM_LEVEL = 1;
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Handles the zoom-in action, increasing the zoom level by 0.2, but not exceeding a maximum of 3.
  const handleZoomIn = () => {
    setZoomLevel(Math.min(MAX_ZOOM_LEVEL, zoomLevel + 0.2));
  };

  // Handles the zoom-out action, decreasing the zoom level by 0.2, but not going below a minimum of 1.
  const handleZoomOut = () => {
    setZoomLevel(Math.max(MIN_ZOOM_LEVEL, zoomLevel - 0.2));
  };

  const handleNodeClick = (node) => {
    console.log(node, 'node clicked');
  };

  const closePopup = () => {
    setSelectedComponent(null);
  };

  if (!selectedComponent) {
    return <div className={styles['mainCt']}></div>;
  }

  return (
    <motion.div
      className={styles['mainCt']}
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="component-preview-modal"
    >
      <div className={styles['top']}>
        <div className={styles['zizo-inner']}>
          <Image src={zoomInIcon} onClick={handleZoomIn} alt="zoom-in" />
          <Image src={zoomOutIcon} onClick={handleZoomOut} alt="zoom-out" />
        </div>
        <div className={styles['component-name']}>
          {selectedComponent.node.data?.label || 'Untitled Component'}
        </div>
        <button className={styles['close-button']} onClick={closePopup}>
          <Image src={closeIcon} alt="" />
        </button>
      </div>
      <div className={styles['preview-ct']}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            transition: 'transform 0.3s ease-in-out',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <RoadmapSVGViewer
            roadmap_graph={{
              nodes: selectedComponent.subtree.nodes,
              edges: selectedComponent.subtree.edges,
            }}
            learningProgress={{}}
            onNodeClick={handleNodeClick}
            source="draw-roadmap"
          />

          <div style={{ position: 'absolute', top: '0', left: '0' }}>
            <EdgeMarkers />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ComponentPreviewModal;
