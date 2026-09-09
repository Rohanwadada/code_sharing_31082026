'use client';

import { useThreadStore } from '@/store/threadStore';
import styles from './ArtifactViewer.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import RoadmapArtifact from './RoadmapArtifact';
import { useArtifactStore } from '@/store/artifactStore';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import VersionDropdown from './VersionDropdown';
import { getRoadmapAttachment } from '@/utils/artifact';
import { useNotification } from '@/hooks/useNotification';
import { v4 as uuid4 } from 'uuid';
import Skeleton from '../utility/Skeleton';
import VersionDiffRenderer from './VersionDiffRenderer';
import { useSidebarStore } from '@/store/sidebarStore';
import { getArtifact, saveRoadmapArtifact } from '@/service/artifact.service';
import { emailRoadmapArtifact } from '@/service/thread.service';

const animationVariant = {
  hidden: {
    opacity: 0,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  visible: {
    opacity: 1,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

const ArtifactViewer = () => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const artifactId = useArtifactStore((s) => s.artifactId);
  const setArtifactId = useArtifactStore((s) => s.setArtifactId);
  const artifactType = useArtifactStore((s) => s.artifactType);
  const artifactTitle = useArtifactStore((s) => s.title);
  const setArtifactTitle = useArtifactStore((s) => s.setTitle);
  const setArtifactDescription = useArtifactStore((s) => s.setDescription);
  const setArtifactType = useArtifactStore((s) => s.setArtifactType);
  const setArtifactData = useArtifactStore((s) => s.setArtifactData);
  const artifactMetadata = useArtifactStore((s) => s.artifactMetadata);
  const setArtifactMetadata = useArtifactStore((s) => s.setArtifactMetadata);
  const resetArtifactStore = useArtifactStore((s) => s.reset);

  const threadId = useThreadStore((s) => s.threadId);
  const setIsArtifactOpen = useThreadStore((s) => s.setIsArtifactOpen);
  const chatMinimized = useThreadStore((s) => s.chatMinimized);
  const setChatMinimized = useThreadStore((s) => s.setChatMinimized);
  const setMobileTab = useThreadStore((s) => s.setMobileTab);
  const availableArtifacts = useThreadStore((s) => s.availableArtifacts);

  const isArtifactSaved = useArtifactStore(
    (s) => s.artifactMetadata?.saved || false,
  );

  const setSavedRoadmaps = useSidebarStore((s) => s.setSavedRoadmaps);

  const {
    showLoadingNotification,
    resolveNotification,
    rejectNotification,
    showNotification,
  } = useNotification();

  const [isActiveApiCall, setIsActiveApiCall] = useState(false);
  const [isArtifactFetching, setIsArtifactFetching] = useState(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [showVersionDiff, setShowVersionDiff] = useState(false);

  const artifactVerionDropdownRef = useRef(null);

  const handleCloseArtifact = () => {
    setIsArtifactOpen(false);
    if (chatMinimized) {
      setChatMinimized(false);
    }
    setMobileTab('chat');
    setShowVersionDiff(false);
    resetArtifactStore();
  };

  const fetchArtifact = async (threadId, artifactId) => {
    try {
      setIsArtifactFetching(true);

      const responseData = await getArtifact(threadId, artifactId);
      setArtifactTitle(responseData.title);
      setArtifactDescription(responseData.description);
      setArtifactType(responseData.type);
      setArtifactData(responseData.data);
      setArtifactMetadata(responseData.meta);
    } catch (error) {
      console.error(error);
    } finally {
      setIsArtifactFetching(false);
    }
  };

  const toggleVersionDropdown = () => {
    if (availableArtifacts.length <= 1) return;
    setIsVersionDropdownOpen(!isVersionDropdownOpen);
  };

  const changeArtifact = (artifactId) => {
    setArtifactId(artifactId);
    setIsVersionDropdownOpen(!isVersionDropdownOpen);
    setShowVersionDiff(false);
  };

  const handleEmailRoadmap = async () => {
    if (isActiveApiCall) return;
    const toastId = uuid4();
    showLoadingNotification(toastId, 'Sending roadmap. Please wait');
    try {
      setIsActiveApiCall(true);

      const roadmapAttachment = await getRoadmapAttachment('pdf');

      console.log('Attachment: ', roadmapAttachment);

      const response = await emailRoadmapArtifact(
        threadId,
        userDetails?.email,
        roadmapAttachment,
      );

      resolveNotification(toastId, 'Roadmap sent to your email');
    } catch (error) {
      console.error(error);
      rejectNotification(toastId, 'Something went wrong. Please try again');
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleSaveRoadmap = async () => {
    if (isActiveApiCall) return;
    try {
      setIsActiveApiCall(true);
      const response = await saveRoadmapArtifact(
        threadId,
        artifactId,
        'artifact',
      );
      if (response.status === 'success') {
        setArtifactMetadata((prev) => ({
          ...prev,
          saved: true,
        }));
        setSavedRoadmaps((prev) => [
          {
            slug: response.slug,
            title: response.title,
            created_at: new Date(),
            updated_at: new Date(),
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error(error);
      showNotification('error', error.message);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const toggleVersionDiff = () => {
    setShowVersionDiff(!showVersionDiff);
    if (!showVersionDiff && !chatMinimized) {
      setChatMinimized(true);
    } else if (showVersionDiff && chatMinimized) {
      setChatMinimized(false);
    }
  };

  useEffect(() => {
    if (artifactId) {
      fetchArtifact(threadId, artifactId);
    }
  }, [artifactId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        artifactVerionDropdownRef.current &&
        !artifactVerionDropdownRef.current.contains(event.target)
      ) {
        setIsVersionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <motion.div
      className={styles['artifact-ct']}
      variants={animationVariant}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <div className={styles['top']}>
        {/* <span className={styles['version-ct']}>Version 01</span> */}
        <span
          className={styles['title']}
          onClick={toggleVersionDropdown}
          ref={artifactVerionDropdownRef}
        >
          {isArtifactFetching ? (
            <Skeleton width={'125px'} height={'26px'} />
          ) : (
            <>
              <span
                className={styles['title-text']}
              >{`${artifactTitle}(Version ${String(artifactMetadata?.version?.version_tag + 1).padStart(2, '0')})`}</span>
              {availableArtifacts.length > 1 && (
                <DropdownIcon isOpen={isVersionDropdownOpen} />
              )}
            </>
          )}
          <AnimatePresence>
            {isVersionDropdownOpen && (
              <VersionDropdown
                currentArtifactId={artifactId}
                data={availableArtifacts}
                onChange={changeArtifact}
              />
            )}
          </AnimatePresence>
        </span>
        <div className={styles['action-ct']}>
          {isArtifactFetching ? (
            <Skeleton width={'125px'} height={'26px'} />
          ) : (
            artifactMetadata?.generation_status === 'complete' && (
              <div className={styles['action-ct-left']}>
                {availableArtifacts.length > 1 && (
                  <DiffIcon
                    isActive={showVersionDiff}
                    onClick={toggleVersionDiff}
                    fill={showVersionDiff ? '#00f0ff' : 'none'}
                  />
                )}
                <Email onClick={handleEmailRoadmap} />
                <Bookmark
                  onClick={handleSaveRoadmap}
                  fill={isArtifactSaved ? 'var(--brand-primary)' : 'none'}
                />
              </div>
            )
          )}
          <CloseIcon onClick={handleCloseArtifact} />
        </div>
      </div>
      {isArtifactFetching ? (
        <ArtifactSkeleton />
      ) : (
        <>
          {artifactType === 'roadmap' && (
            <RoadmapArtifact onClose={handleCloseArtifact} />
          )}

          {showVersionDiff && (
            <VersionDiffRenderer
              threadId={threadId}
              currentArtifactId={artifactId}
              availableArtifacts={availableArtifacts}
            />
          )}
        </>
      )}
    </motion.div>
  );
};

const ArtifactSkeleton = () => {
  const getRandom = (min = 80, max = 100) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const CompositeSkeleton = () => {
    return (
      <>
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton
              key={i}
              baseColor="#e5e7eb"
              variant="text"
              animationType="wave"
              height="20px"
              width={`${getRandom()}%`}
            />
          ))}
      </>
    );
  };

  return (
    <div
      style={{
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        backgroundColor: '#faf5f2',
      }}
    >
      <CompositeSkeleton />
      <CompositeSkeleton />
      <CompositeSkeleton />
      <CompositeSkeleton />
      <CompositeSkeleton />
    </div>
  );
};

const Email = ({ width = 22, height = 22, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 21 17"
      fill="none"
      {...props}
    >
      <path
        d="M20.25 3V13.5C20.25 14.0967 20.0129 14.669 19.591 15.091C19.169 15.5129 18.5967 15.75 18 15.75H3C2.40326 15.75 1.83097 15.5129 1.40901 15.091C0.987053 14.669 0.75 14.0967 0.75 13.5V3M20.25 3C20.25 2.40326 20.0129 1.83097 19.591 1.40901C19.169 0.987053 18.5967 0.75 18 0.75H3C2.40326 0.75 1.83097 0.987053 1.40901 1.40901C0.987053 1.83097 0.75 2.40326 0.75 3M20.25 3V3.243C20.25 3.62715 20.1517 4.00491 19.9644 4.3403C19.7771 4.67569 19.5071 4.95754 19.18 5.159L11.68 9.774C11.3252 9.99253 10.9167 10.1082 10.5 10.1082C10.0833 10.1082 9.67479 9.99253 9.32 9.774L1.82 5.16C1.49292 4.95854 1.22287 4.67669 1.03557 4.3413C0.848269 4.00591 0.749957 3.62815 0.75 3.244V3"
        stroke="#485363"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Bookmark = ({ width = 22, height = 22, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 14 17"
      fill="none"
      {...props}
    >
      <path
        d="M11.6608 1.0196C12.5775 1.12627 13.25 1.9171 13.25 2.84044V15.7513L7 12.6263L0.75 15.7513V2.84044C0.75 1.9171 1.42167 1.12627 2.33917 1.0196C5.43599 0.660132 8.56401 0.660132 11.6608 1.0196Z"
        stroke="#485363"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const DiffIcon = ({ width = 22, height = 22, isActive, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fill={isActive ? '#00f0ff' : 'none'}
        stroke="#485363"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Zm-6 8h6m-3 3V7M9 17h6"
      />
    </svg>
  );
};

const CloseIcon = ({ width = 26, height = 26, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M6 18L18 6M6 6L18 18"
        stroke="#485363"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const DropdownIcon = ({ isOpen, width = 20, height = 20, ...props }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      animate={{ rotate: isOpen ? 90 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ originX: '50%', originY: '50%' }}
      {...props}
    >
      <path
        d="M6.875 3.75L13.125 10L6.875 16.25"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
};

export default ArtifactViewer;
