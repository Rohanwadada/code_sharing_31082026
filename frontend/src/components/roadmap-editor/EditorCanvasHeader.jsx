import React, { useContext, useEffect, useRef, useState } from 'react';
import setuLogo from '@/assets/shifu-logo-small.png';
import styles from './EditorCanvasHeader.module.css';
import RoadmapTitleEditor from './roadmap-utility/RoadmapTitleEditor';
import { emitCustomEvent } from '@/utils/helper';
import { RoadmapContext } from '@/context/RoadmapContext';
import saveIcon from '@/assets/roadmap-control-panel/save-icon.svg';
import previewIcon from '@/assets/roadmap-control-panel/preview-icon.svg';
import publishIcon from '@/assets/roadmap-control-panel/publish-icon.svg';
import manageAccessIcon from '@/assets/roadmap-control-panel/manage-access-icon.svg';
import dashboardIcon from '@/assets/roadmap-control-panel/dashboard-icon.svg';
import pushEmailIcon from '@/assets/roadmap-control-panel/push-email-icon.svg';
import colseIcon from '@/assets/close.svg';
import RoadmapAccessSharing from './RoadmapAccessSharing';
import { AnimatePresence } from 'framer-motion';
import ContentUpdateMailerModal from './modals/ContentUpdateMailerModal';
import { useNotification } from '@/hooks/useNotification';
import componentBagIcon from '@/assets/component-bag-icon.svg';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ADMIN_ROLE } from '@/utils/constants';
import {
  getComponents,
  removeComponentFromBag,
} from '@/service/roadmapBlock.service';

/**
 * EditorCanvasHeader Component
 *
 * This component displays the application's header, including the logo, navigation,
 * user authentication controls, and a dropdown user details card.
 *
 * @component
 * @param {Object} props - Component properties.
 * @param {Object} [props.style] - Additional styles to apply to the header.
 * @returns {JSX.Element} The rendered Header component.
 */
const EditorCanvasHeader = ({ roadmapId }) => {
  const {
    roadmapVisibility,
    setRoadmapVisibility,
    roadmapStatus,
    setRoadmapSatus,
    roadmapTitle,
    roadmapAccess,
    isSavingRoadmap,
    componentBagData,
    setComponentBagData,
    showComponentBag,
    setShowComponentBag,
  } = useContext(RoadmapContext);

  const userDetails = useAuthStore((s) => s.userDetails);

  // State for displaying user details dropdown
  const [showUserDetailsCard, setShowUserDetailsCard] = useState(false);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [showContentUpdateMailerModal, setShowContentUpdateMailerModal] =
    useState(false);
  const [currentRoadmap, setCurrentRoadmap] = useState({});
  // const [showComponentBag, setShowComponentBag] = useState(false);

  // Refs for detecting clicks outside the dropdown
  const userLogoRef = useRef(null);
  const userDetailsCardRef = useRef(null);

  // Hook for navigation
  const router = useRouter();

  // const isAdmin = userDetails?.role === ADMIN_ROLE;
  const isAdmin = true;

  /**
   * Closes the user details dropdown.
   */
  const closeUserDetailsCard = () => setShowUserDetailsCard(false);
  const onCancleManageAccess = () => {
    setShowManageAccessModal(false);
  };
  const onCancleContentUpdateMailer = () => {
    setShowContentUpdateMailerModal(false);
  };

  const handleSaveClick = () => {
    emitCustomEvent('roadmap::update', {});
  };

  const handleNavigateToDashboard = () => {
    router.push('/dashboard');
  };

  const handleKeyDown = (event) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      emitCustomEvent('roadmap::update', {});
    }
  };

  const handlePreviewButtonClick = () => {
    window.open(`/draw-roadmap/preview/${roadmapId}`, '_blank');
  };

  const handleRoadmapPublish = () => {
    // const newVisibility = roadmapVisibility === 'public' ? 'private' : 'public';
    const newStatus = roadmapStatus === 'draft' ? 'published' : 'draft';
    // setRoadmapVisibility(newVisibility);
    setRoadmapSatus(newStatus);
    emitCustomEvent('roadmap::update', {
      // visibility: newVisibility,
      status: newStatus,
      // change: 'visibility',
    });
  };

  const handleManageAccessClick = () => {
    setShowManageAccessModal(true);
  };

  const handleContentUpdateMailerClick = () => {
    setShowContentUpdateMailerModal(true);
  };

  const handleComponentBagClick = () => {
    setShowComponentBag(!showComponentBag);
  };

  /**
   * Function to fetch user specific data. Kind of roadmap speciific user data like components, color pallets etc.
   */
  const getRoadmapUserData = async () => {
    try {
      const responseData = await getComponents();
      setComponentBagData(responseData?.components || []);
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Detects clicks outside the user details dropdown and closes it.
   * Runs when `showUserDetailsCard` changes.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDetailsCardRef.current &&
        !userDetailsCardRef.current.contains(event.target) &&
        userLogoRef.current &&
        !userLogoRef.current.contains(event.target)
      ) {
        closeUserDetailsCard();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDetailsCard]);

  /**
   * Set the current roadmap to the manage access modal to provide access for the roadmap and get roadmap share data
   * Runs when `roadmapAccess`, `roadmapId`, `roadmapTitle` changes.
   */
  useEffect(() => {
    setCurrentRoadmap({
      r_id: roadmapId,
      title: roadmapTitle,
      owner: roadmapAccess === 'owner',
    });
  }, [roadmapAccess, roadmapId, roadmapTitle]);

  /**
   * Get roadmap uset data from server
   * Runs only in first render
   */
  useEffect(() => {
    if (isAdmin) {
      getRoadmapUserData();
    }
  }, []);

  return (
    <>
      <div className={styles['header']}>
        <div className={styles['logo']}>
          <a href={'/'}>
            <Image src={setuLogo} alt="logo" className={styles['logo-img']} />
          </a>
          {/* Roadmap Title Editor */}
          <RoadmapTitleEditor roadmapId={roadmapId} />
        </div>
        <div className={styles['actions']}>
          <div className={styles['util-div']} onClick={handleSaveClick}>
            <Image src={saveIcon} height={22} width={22} alt="" />
            <div>{isSavingRoadmap ? 'Saving...' : 'Save'}</div>
          </div>
          <div
            className={styles['util-div']}
            onClick={handlePreviewButtonClick}
          >
            <Image src={previewIcon} height={22} width={22} alt="" />
            <div>Preview</div>
          </div>

          {isAdmin && (
            <div className={styles['util-div']} onClick={handleRoadmapPublish}>
              <Image src={publishIcon} height={22} width={22} alt="" />
              <div>
                {roadmapStatus === 'published' ? 'Unpublish' : 'Publish'}
              </div>
            </div>
          )}

          {isAdmin && (
            <div
              className={`${styles['util-div']} ${showManageAccessModal ? styles['manage-access-open'] : ''}`}
              onClick={handleManageAccessClick}
            >
              <Image src={manageAccessIcon} height={22} width={22} alt="" />
              <div>Manage Access</div>
            </div>
          )}

          <div
            className={styles['util-div']}
            onClick={handleNavigateToDashboard}
          >
            <Image src={dashboardIcon} height={22} width={22} alt="" />
            <div>Dashboard</div>
          </div>

          {isAdmin && (
            <div
              className={styles['util-div']}
              onClick={handleContentUpdateMailerClick}
            >
              <Image src={pushEmailIcon} height={22} width={22} alt="" />
              <div>Send Updates</div>
            </div>
          )}

          {isAdmin && (
            <div
              className={`${styles['util-div']} ${showComponentBag ? styles['component-bag-open'] : ''}`}
              onClick={handleComponentBagClick}
            >
              <div className={styles['component-bag-ct']}>
                <Image src={componentBagIcon} height={22} width={22} alt="" />
                <div
                  className={`${styles['component-count-badge']} ${showComponentBag ? styles['active'] : ''}`}
                >
                  <span>{componentBagData.length}</span>
                </div>
              </div>
              <div>Component Bag</div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <AnimatePresence>
          {showManageAccessModal && (
            <RoadmapAccessSharing
              source="canvas"
              currentRoadmap={currentRoadmap}
              onCancel={onCancleManageAccess}
            />
          )}
        </AnimatePresence>
      )}

      {isAdmin && (
        <AnimatePresence>
          {showContentUpdateMailerModal && (
            <ContentUpdateMailerModal
              roadmapId={roadmapId}
              onCancel={onCancleContentUpdateMailer}
            />
          )}
        </AnimatePresence>
      )}
    </>
  );
};

const ComponentBagViewer = ({ componentBagData, setComponentBagData }) => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const { setSelectedComponent } = useContext(RoadmapContext);
  const { showNotification } = useNotification();

  const getNodeTypeText = (nodeType) => {
    switch (nodeType) {
      case 'title':
        return 'Title / Complete Roadmap';
      case 'topic':
      case 'topicGroup':
        return 'Topic - Contains n modules';
      case 'subtopicGroup':
        return 'Module - Contains n chapters ';
      case 'subtopic':
        return 'A single chapter';
      case 'assignmentNode':
        return 'A single assignment';
      default:
        return nodeType;
    }
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

  return (
    <div
      className={styles['component-bag-viewer-ct']}
      onClick={(e) => e.stopPropagation()}
    >
      {componentBagData.length <= 0 ? (
        <div className={styles['no-component-ct']}>
          <span>No Component Added</span>
        </div>
      ) : (
        <div className={styles['component-bag-viewer-ct-scroll']}>
          <div className={styles['component-bag-viewer-ct-inner']}>
            {componentBagData.map((component, index) => (
              <div
                key={index}
                className={styles['component-ct']}
                component-type={component.node?.type || 'subtopic'}
                onDragStart={(event) => onDragStart(event, component)}
                draggable={true}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponent(component);
                }}
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
                  className={styles['add-to-bag']}
                  onClick={(e) => handleRemoveClick(e, component)}
                >
                  <Image src={colseIcon} alt="remove_component_icon" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default EditorCanvasHeader;
