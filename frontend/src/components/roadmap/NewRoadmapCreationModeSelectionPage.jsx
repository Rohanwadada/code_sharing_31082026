'use client';

import { motion } from 'framer-motion';
import styles from './NewRoadmapCreationModeSelectionPage.module.css';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import shifuIcon from '@/assets/bot/thinking.png';
import Image from 'next/image';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
};

import { usePromptSharingContext } from '@/context/PromptSharingContext';

const NewRoadmapCreationModeSelectionPage = ({ projectId }) => {
  const router = useRouter();
  const { handleGeneratePromptAndNavigate, isGenerating } = usePromptSharingContext();

  const handleCreateWithShifu = async () => {
    if (isGenerating) return;
    try {
      await handleGeneratePromptAndNavigate(projectId);
    } catch (err) {
      console.error('Failed to generate prompt via Shifu:', err);
      // Fallback navigation if API error
      router.push(`/project/${projectId}/shifu`);
    }
  };

  const handleCreateManually = () => {
    router.push(`/project/${projectId}/create`);
    // onClose();
  };

  return (
    <motion.div
      className={styles['backdrop']}
      // onClick={onClose}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="new-roadmap-backdrop"
    >
      <motion.div
        className={styles['modal']}
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        key="new-roadmap-modal"
      >
        <div className={styles['modal-head']}>
          <span className={styles['text']}>New Roadmap</span>
          {/* <button
            className={styles['close-btn']}
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>*/}
        </div>
        <p className={styles['subtitle']}>
          Choose how you want to create your learning roadmap
        </p>

        <div className={styles['modal-body']}>
          <div className={styles['options']}>
            <button
              className={styles['option-card']}
              onClick={handleCreateWithShifu}
              disabled={isGenerating}
              style={isGenerating ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
              custom={0}
            >
              <div className={styles['card-head']}>
                <div className={styles['option-icon-shifu']}>
                  <Image src={shifuIcon} alt="shifu-icon" />
                </div>
                <span className={styles['option-label']}>
                  {isGenerating ? 'Generating Prompt...' : 'Create with Shifu'}
                </span>
              </div>
              <div className={styles['option-desc']}>
                {isGenerating
                  ? 'Analyzing role & requirements to generate prompt...'
                  : 'AI-assisted roadmap generation tailored to your goals'}
              </div>
              <div className={styles['option-arrow']}>
                <div className={styles['arrow-btn']}>
                  {isGenerating ? '⏳' : <ArrowRightIcon />}
                </div>
              </div>
              <div className={styles['option-badge']}>Recommended</div>
            </button>

            <button
              className={styles['option-card']}
              onClick={handleCreateManually}
              custom={1}
            >
              <div className={styles['card-head']}>
                <div className={styles['option-icon-shifu']}>
                  <PencilIcon />
                </div>
                <span className={styles['option-label']}>Create Manually</span>
              </div>
              <div className={styles['option-desc']}>
                Build your roadmap from scratch in the editor
              </div>
              <div className={styles['option-arrow']}>
                <div className={styles['arrow-btn']}>
                  <ArrowRightIcon />
                </div>
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ArrowRightIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.16663 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PencilIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M16.862 4.48725L18.549 2.79925C18.9007 2.44757 19.3777 2.25 19.875 2.25C20.3723 2.25 20.8493 2.44757 21.201 2.79925C21.5527 3.15092 21.7502 3.6279 21.7502 4.12525C21.7502 4.62259 21.5527 5.09957 21.201 5.45125L6.832 19.8202C6.30332 20.3486 5.65137 20.737 4.935 20.9502L2.25 21.7502L3.05 19.0652C3.26328 18.3489 3.65163 17.6969 4.18 17.1682L16.863 4.48725H16.862ZM16.862 4.48725L19.5 7.12525"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 5L5 15M5 5L15 15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

NewRoadmapCreationModeSelectionPage.propTypes = {
  // onClose: PropTypes.func.isRequired,
  projectId: PropTypes.func.isRequired,
};

export default NewRoadmapCreationModeSelectionPage;
