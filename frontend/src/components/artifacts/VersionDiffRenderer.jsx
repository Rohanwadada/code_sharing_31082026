'use client';

import ReactDiffViewer from 'react-diff-viewer-continued';
import styles from './VersionDiffRenderer.module.css';
import VersionDropdown from './VersionDropdown';
import { useState, useEffect, useRef } from 'react';
import { getArtifact } from '@/service/artifact.service';
import { useAuthStore } from '@/store/authStore';
import { AnimatePresence, motion } from 'framer-motion';
import Skeleton from '../utility/Skeleton';

const VersionDiffRenderer = ({
  threadId,
  currentArtifactId,
  availableArtifacts,
}) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const [leftArtifactId, setLeftArtifactId] = useState(null);
  const [rightArtifactId, setRightArtifactId] = useState(null);
  const [isLeftVersionDropdownOpen, setIsLeftVersionDropdownOpen] =
    useState(false);
  const [isRightVersionDropdownOpen, setIsRightVersionDropdownOpen] =
    useState(false);

  const [leftContent, setLeftContent] = useState(null);
  const [rightContent, setRightContent] = useState(null);
  const [isFetchingArtifact, setIsFetchingArtifact] = useState(null);

  // reusable fetcher
  const loadArtifact = async (artifactId, setter) => {
    if (!artifactId) return;

    try {
      setIsFetchingArtifact(true);
      const data = await getArtifact(threadId, artifactId);
      setter(data?.data?.dsl || '');
    } catch (err) {
      console.error('Failed to fetch artifact', err);
      setter('');
    } finally {
      setIsFetchingArtifact(false);
    }
  };

  const changeLeftArtifact = (artifactId) => {
    if (artifactId === rightArtifactId) return;
    setLeftArtifactId(artifactId);
  };

  const changeRightArtifact = (artifactId) => {
    if (artifactId === leftArtifactId) return;
    setRightArtifactId(artifactId);
  };

  const leftArtifact = availableArtifacts.find(
    (item) => item.a_id === leftArtifactId,
  );

  const rightArtifact = availableArtifacts.find(
    (item) => item.a_id === rightArtifactId,
  );

  const leftTitle = leftArtifact
    ? `${leftArtifact.title}(Version ${leftArtifact.version_tag + 1})`
    : 'Select Version';

  const rightTitle = rightArtifact
    ? `${rightArtifact.title}(Version ${rightArtifact.version_tag + 1})`
    : 'Select Version';

  // initial selection
  useEffect(() => {
    if (!availableArtifacts?.length) return;

    const currentIndex = availableArtifacts.findIndex(
      (item) => item.a_id === currentArtifactId,
    );

    // only one artifact
    if (availableArtifacts.length === 1) {
      setLeftArtifactId(availableArtifacts[0]?.a_id);
      setRightArtifactId(availableArtifacts[0]?.a_id);
      return;
    }

    // first artifact -> compare with next
    if (currentIndex === 0) {
      setLeftArtifactId(availableArtifacts[0]?.a_id);
      setRightArtifactId(availableArtifacts[1]?.a_id);
      return;
    }

    // normal case -> previous vs current
    setLeftArtifactId(availableArtifacts[currentIndex - 1]?.a_id);
    setRightArtifactId(availableArtifacts[currentIndex]?.a_id);
  }, [availableArtifacts, currentArtifactId]);

  // fetch left
  useEffect(() => {
    loadArtifact(leftArtifactId, setLeftContent);
  }, [leftArtifactId]);

  // fetch right
  useEffect(() => {
    loadArtifact(rightArtifactId, setRightContent);
  }, [rightArtifactId]);

  return (
    <div className={styles['main-container']}>
      <div className={styles['container-head']}>
        <div className={styles['dropdown-container']}>
          <div
            onClick={() =>
              setIsLeftVersionDropdownOpen(!isLeftVersionDropdownOpen)
            }
            className={styles['dropdown-ct']}
          >
            <span className={styles['title']}>
              {leftTitle}{' '}
              <DropdownIcon
                width={14}
                height={14}
                isOpen={isLeftVersionDropdownOpen}
              />
            </span>
            <AnimatePresence>
              {isLeftVersionDropdownOpen && (
                <VersionDropdown
                  currentArtifactId={leftArtifactId}
                  data={availableArtifacts}
                  onChange={changeLeftArtifact}
                />
              )}
            </AnimatePresence>
          </div>

          <span>vs</span>

          <div
            onClick={() =>
              setIsRightVersionDropdownOpen(!isRightVersionDropdownOpen)
            }
            className={styles['dropdown-ct']}
          >
            <span className={styles['title']}>
              {rightTitle}{' '}
              <DropdownIcon
                width={14}
                height={14}
                isOpen={isRightVersionDropdownOpen}
              />
            </span>
            <AnimatePresence>
              {isRightVersionDropdownOpen && (
                <VersionDropdown
                  currentArtifactId={rightArtifactId}
                  data={availableArtifacts}
                  onChange={changeRightArtifact}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        <DslStructureHelp />
      </div>

      <div>
        {isFetchingArtifact ? (
          <DiffSkeleton />
        ) : leftContent && rightContent ? (
          <ReactDiffViewer
            oldValue={leftContent}
            newValue={rightContent}
            splitView
            disableWordDiff
            hideSummary
            showDiffOnly={false}
          />
        ) : (
          <DiffSkeleton />
        )}
      </div>
    </div>
  );
};

const DslStructureHelp = () => {
  const [showHelpCard, setShowHelpCard] = useState(false);
  const helpIconRef = useRef(null);
  const helpCardRef = useRef(null);

  const toggleHelpCard = () => {
    setShowHelpCard(!showHelpCard);
  };

  const closeHelpCard = () => {
    setShowHelpCard(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        helpCardRef.current &&
        !helpCardRef.current.contains(event.target) &&
        helpIconRef.current &&
        !helpIconRef.current.contains(event.target)
      ) {
        closeHelpCard();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelpCard]);

  return (
    <div className={styles['help-ct']}>
      <HelpIcon
        ref={helpIconRef}
        onClick={toggleHelpCard}
        onMouseEnter={() => setShowHelpCard(true)}
        onMouseLeave={() => setShowHelpCard(false)}
      />
      <AnimatePresence>
        {showHelpCard && (
          <motion.div
            className={styles['dslh-ct']}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            ref={helpCardRef}
          >
            {/* <div>Line starts with </div>*/}
            <div>
              <span className={styles['dslh-chip']}>#</span> Title of the
              roadmap
            </div>
            <div>
              <span className={styles['dslh-chip']}>##</span> Topic
            </div>
            <div>
              <span className={styles['dslh-chip']}>####</span> Module
            </div>
            <div>
              <span className={styles['dslh-chip']}>-</span> Chapter
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DiffSkeleton = () => {
  const getRandom = (min = 80, max = 100) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const CompositeSkeleton = ({ count }) => {
    return (
      <>
        {Array(count)
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
        width: '100%',
        display: 'inline-flex',
        gap: '5px',
        padding: '10px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}
      >
        <CompositeSkeleton count={100} />
      </div>
      <div
        style={{
          height: '100%',
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}
      >
        <CompositeSkeleton count={100} />
      </div>
    </div>
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

const HelpIcon = ({ width = 20, height = 20, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01" />
      </g>
    </svg>
  );
};

export default VersionDiffRenderer;
