import { useContext, useMemo, useState } from 'react';
import styles from './ComponentBagModal.module.css';
import searchIcon from '@/assets/search-icon.svg';
import closeIcon from '@/assets/close.svg';
import { RoadmapContext } from '@/context/RoadmapContext';
import { getNodeTypeText } from '@/utils/helper';
import { useNotification } from '@/hooks/useNotification';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import { removeComponentFromBag } from '@/service/roadmapBlock.service';

// Animation Variants
const modalVariants = {
  hidden: {
    x: '100%',
    zIndex: 2,
    transition: {
      type: 'tween',
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
  visible: {
    x: 0,
    zIndex: 2,
    transition: {
      type: 'tween',
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const ComponentBagModal = () => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const {
    componentBagData,
    setComponentBagData,
    setSelectedComponent,
    showComponentBag,
    setShowComponentBag,
  } = useContext(RoadmapContext);
  const { showNotification } = useNotification();
  const [searchInput, setSearchInput] = useState('');

  const filteredData = useMemo(() => {
    let result = componentBagData;
    const query = searchInput.toLowerCase().trim();
    if (query !== '') {
      result = result.filter((r) =>
        r.node.data.label.toLowerCase().includes(query),
      );
    }
    return result;
  }, [searchInput, componentBagData]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchInput(value);
  };

  const handlePreviewClick = (component) => {
    setSelectedComponent(component);
  };

  const onDragStart = (event, roadmapSnippet) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('dragType', 'predefined-roadmap-component-drag');
    event.dataTransfer.setData('dragData', JSON.stringify(roadmapSnippet));
  };

  const handleRemoveClick = async (event, component) => {
    event.stopPropagation();
    try {
      const responseData = await removeComponentFromBag(component);
      setComponentBagData((prev) =>
        prev.filter(
          (c) =>
            !(c.node.id === component.node.id && c.r_id === component.r_id),
        ),
      );
    } catch (error) {
      console.error(error);
      showNotification('error', 'Something went wrong');
    }
  };

  const closePopup = () => {
    setShowComponentBag(false);
  };

  return (
    <motion.div
      className={styles['mainCt']}
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="component-bag-modal"
    >
      <div className={styles['top']}>
        <div className={styles['search-ct']}>
          <Image src={searchIcon} alt="search-icon" />
          <input
            type="text"
            placeholder="Search components"
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <button className={styles['close-button']} onClick={closePopup}>
          <Image src={closeIcon} alt="close-icon" />
        </button>
      </div>
      <div className={styles['help-text']}>
        Drag and drop the structures you want
      </div>
      <div className={styles['search-result-outer']}>
        <div className={styles['search-result-inner']}>
          {filteredData.map((component, index) => (
            <div
              key={index}
              className={styles['search-result']}
              component-type={component.node?.type || 'subtopic'}
              onClick={() => handlePreviewClick(component)}
              onDragStart={(event) => onDragStart(event, component)}
              draggable={true}
            >
              <div className={styles['component-info']}>
                <span className={styles['component-name']}>
                  {component.node.data?.label || 'Untitled Node'}
                </span>
                <span className={styles['component-text']}>
                  {getNodeTypeText(
                    component.node?.type || 'Node do not have any type',
                  )}
                </span>
              </div>
              <button
                className={`${styles['remove-from-bag']}`}
                onClick={(e) => handleRemoveClick(e, component)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="none"
                >
                  <path
                    d="M1 10L10 1M1 1L10 10"
                    stroke="black"
                    strokeOpacity="0.48"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ComponentBagModal;
