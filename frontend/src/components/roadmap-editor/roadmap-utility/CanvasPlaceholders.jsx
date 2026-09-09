import { useContext, useEffect, useRef } from 'react';
import styles from './CanvasPlaceholders.module.css';
import { RoadmapContext } from '@/context/RoadmapContext';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { useRoadmapEditorSidebarStore } from '@/store/roadmapEditorSidebarStore';

const CanvasPlaceholders = ({ onDrop }) => {
  const activeSection = useRoadmapEditorSidebarStore((s) => s.activeSection);
  const { nodes, isDraggingComponent, setIsDraggingComponent } =
    useContext(RoadmapContext);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const canvasPlaceholderRef = useRef(null);
  console.log(isDraggingComponent);

  const onDragEnter = (event) => {
    console.log(event);
    setIsDraggingComponent(true);
  };
  const onDragLeave = (event) => {
    console.log(event);
    setIsDraggingComponent(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onDrop(e); // delegate directly to canvas drop handler
  };

  useEffect(() => {
    if (canvasPlaceholderRef.current) {
      let sidebarWidth = 80; // base sidebar

      if (activeSection) {
        if (activeSection.name === 'predefined-module-section') {
          sidebarWidth += 290;
        } else {
          sidebarWidth += 205;
        }
      }

      const availableWidth = windowWidth - sidebarWidth;
      const centerPos = sidebarWidth + availableWidth / 2;

      canvasPlaceholderRef.current.style.left = `${centerPos}px`;
      canvasPlaceholderRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, [activeSection, windowWidth]);

  return (
    <>
      {nodes.length === 0 &&
        activeSection?.name === 'predefined-module-section' && (
          <div
            className={styles['placeholder']}
            ref={canvasPlaceholderRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
          >
            {isDraggingComponent ? (
              <span className={styles['drop-container']}>
                Drop Your Component Here
              </span>
            ) : (
              <>
                <span className={styles['placeholder-top']}>Empty Roadmap</span>
                <span className={styles['placeholder-bottom']}>
                  Add Components from the left panel to start building your
                  roadmap
                </span>
              </>
            )}
          </div>
        )}
    </>
  );
};

export default CanvasPlaceholders;
