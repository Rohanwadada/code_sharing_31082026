import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ContentGenerationJobStatusViewer.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotification } from '@/hooks/useNotification';
import { emitCustomEvent } from '@/utils/helper';
import { useAuthStore } from '@/store/authStore';
import { useRoadmapStore } from '@/store/roadmapStore';
import { useParams, useRouter } from 'next/navigation';
import NotifyModal from '../modals/NotifyModal';
import Button from '../ui/Button';
import {
  generateRoadmapContentBatch,
  getContentGenerationStatus,
} from '@/service/aiContentGeneration.service';

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending':
      return <PendingIconSVG height={'15'} width={'15'} color={'#ffc727'} />;
    case 'processing':
      return (
        <ProcessingSVG
          height={'15'}
          width={'15'}
          color={'#3867F3'}
          stroke={'#3867F3'}
        />
      );
    case 'complete':
      return <CompleteIconSVG height={'15'} width={'15'} color={'#01a901'} />;
    case 'failed':
      return <FailedIconSVG height={'15'} width={'15'} color={'#ff4c4c'} />;
    default:
      return <PendingIconSVG height={'15'} width={'15'} color={'#3867F3'} />;
  }
};

const ContentGenerationJobStatusViewer = ({ roadmapId }) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const nodes = useRoadmapStore((s) => s.nodes);
  const roadmapTitle = useRoadmapStore((s) => s.roadmapTitle);
  const roadmapAccessLevel = useRoadmapStore((s) => s.roadmapAccessLevel);
  const roadmapGenerationMode = useRoadmapStore((s) => s.roadmapGenerationMode);

  const setSelectedNode = useRoadmapStore((s) => s.setSelectedNode);

  const aiContentGenerationJobDetails = useRoadmapStore(
    (s) => s.aiContentGenerationJobDetails,
  );
  const aiContentGenerationStatus = useRoadmapStore(
    (s) => s.aiContentGenerationStatus,
  );
  const setAiContentGenerationStatus = useRoadmapStore(
    (s) => s.setAiContentGenerationStatus,
  );

  const setIsAiContentGenerationJobRunning = useRoadmapStore(
    (s) => s.setIsAiContentGenerationJobRunning,
  );

  const aiContentGenerationJobData = useRoadmapStore(
    (s) => s.aiContentGenerationJobData,
  );
  const setAiContentGenerationJobData = useRoadmapStore(
    (s) => s.setAiContentGenerationJobData,
  );

  const setGrossRoadmapContent = useRoadmapStore(
    (s) => s.setGrossRoadmapContent,
  );
  const setTotalRoadmapContent = useRoadmapStore(
    (s) => s.setTotalRoadmapContent,
  );

  const setAiContentGenerationJobDetails = useRoadmapStore(
    (s) => s.setAiContentGenerationJobDetails,
  );

  const isAiContentGenerationJobRunning = useRoadmapStore(
    (s) => s.isAiContentGenerationJobRunning,
  );

  const chapterLearningOrder = useRoadmapStore((s) => s.chapterLearningOrder);
  const setCurrentChapterIndex = useRoadmapStore(
    (s) => s.setCurrentChapterIndex,
  );

  const showNotificationModal = useRoadmapStore((s) => s.showNotificationModal);

  const [isOpen, setIsOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  // State to disable or enable button when doing api calls
  const [isActiveApiCall, setIsActiveApiCall] = useState(false);
  // Add new state for popup
  const [showContentTypePopup, setShowContentTypePopup] = useState(false);

  const { showNotification } = useNotification();
  const containerRef = useRef(null);
  const router = useRouter();
  const {projectId} = useParams()

  const checkScroll = () => {
    const container = containerRef.current;
    const threshold = 50;
    if (!container) return;
    const position = container.scrollTop + container.clientHeight;
    const height = container.scrollHeight;

    const nearBottom = position >= height - threshold;
    setShowScrollBtn(!nearBottom);
  };

  const scrollToBottom = () => {
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const getNode = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? node : {};
  };

  const getElapsedTime = (start, end) => {
    const diffMs = new Date(end) - new Date(start);
    const diffSecs = Math.floor(diffMs / 1000);

    const days = Math.floor(diffSecs / 86400);
    const hours = Math.floor((diffSecs % 86400) / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleGenerateButtonClick = (e) => {
    e.stopPropagation();

    // If it's a retry (failed status), call directly without popup
    if (aiContentGenerationStatus === 'failed') {
      initiateContentCreationByAIJob(e, true);
      return;
    }

    // If it's partial generation proceed, call directly without popup
    if (
      aiContentGenerationStatus === 'complete' &&
      aiContentGenerationJobDetails?.generation_state === 'partial_generation'
    ) {
      initiateContentCreationByAIJob(e, false);
      return;
    }

    setShowContentTypePopup(true);
  };

  const handleContentTypeSelection = (e, contentType) => {
    e.stopPropagation();
    setShowContentTypePopup(false);

    if (contentType === 'public') {
      initiateContentCreationByAIJob(e, false);
    } else if (contentType === 'licensed') {
      const courseRecommendationContainer = document.getElementById(
        'course-recommendation-container',
      );
      if (courseRecommendationContainer) {
        courseRecommendationContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        emitCustomEvent('content:courseRecommendation', {});
      }
    }
  };

  /**
   * Initiates an AI content generation job by requesting the server to enqueue a job.
   *
   * @async
   * @function initiateContentCreationByAIJob
   * @description
   * Sends a POST request to the backend `/ai/generate` endpoint with the current user's email and roadmap id
   * to enqueue an AI content generation job. On success the function:
   * - shows an informational notification,
   * - sets the local AI generation status to `'pending'`,
   * - marks the AI job running flag true,
   * - stores job details via `setAiContentGenerationJobDetails` (contains mode and job_id).
   *
   * On failure it shows an error notification. Any exceptions during the network call are caught and result in a
   * generic error notification.
   *
   * Side effects:
   * - showNotification('info' | 'error') is used to inform the user.
   * - setAiContentGenerationStatus, setIsAiContentGenerationJobRunning and setAiContentGenerationJobDetails are updated.
   *
   * @returns {Promise<void>} Resolves after the enqueue request completes (success or failure).
   */
  const initiateContentCreationByAIJob = async (e, retry = false) => {
    e.stopPropagation();
    setIsActiveApiCall(true);
    try {
      const responseData = await generateRoadmapContentBatch(roadmapId, retry);
      showNotification('info', 'Content generation job started');
      setAiContentGenerationStatus('pending');
      setIsAiContentGenerationJobRunning(true);
      setAiContentGenerationJobDetails({
        mode: 'ai',
        job_id: responseData?.job_id,
      });
    } catch (error) {
      showNotification('error', 'Something went wrong');
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleModuleView = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      const el = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
        setSelectedNode(targetNode);
        if (chapterLearningOrder) {
          setCurrentChapterIndex(
            chapterLearningOrder.findIndex((chapter) => chapter.id === nodeId),
          );
        }
        router.replace(`/project/${projectId}/roadmap/${roadmapId}?node=${nodeId}`);
        document.body.style.overflow = 'hidden';
      }
    }
  };

  useEffect(() => {
    // setjobData(mockJobData);
    const pollInterval = 3000;

    const getJobStatus = async () => {
      try {
        if (!aiContentGenerationJobDetails?.job_id) return;
        const responseData = await getContentGenerationStatus(
          roadmapId,
          aiContentGenerationJobDetails?.job_id,
        );
        setAiContentGenerationJobData(responseData);
        setAiContentGenerationStatus(responseData?.overall_status || 'pending');
        setGrossRoadmapContent(responseData?.total_content_count);
        setTotalRoadmapContent(responseData?.total_content_count);
        setAiContentGenerationJobDetails((prev) => ({
          ...prev,
          generation_state: responseData?.generation_state,
        }));
        if (['complete', 'failed'].includes(responseData.overall_status)) {
          setIsAiContentGenerationJobRunning(false);
          clearInterval(intervalId);
          if (
            isAiContentGenerationJobRunning &&
            responseData.overall_status === 'failed'
          ) {
            showNotification('error', 'Content creation failed');
          } else if (
            isAiContentGenerationJobRunning &&
            responseData.overall_status === 'complete'
          ) {
            showNotification('success', 'Content creation complete');
          }
        } else {
          setIsAiContentGenerationJobRunning(true);
        }
      } catch (error) {
        console.log(error);
        clearInterval(intervalId);
        showNotification('error', 'Something went wrong');
      }
    };
    // if(!isAiContentGenerationJobRunning) return;
    getJobStatus();
    const intervalId = setInterval(getJobStatus, pollInterval);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [isAiContentGenerationJobRunning]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => container.removeEventListener('scroll', checkScroll);
  }, [isOpen, aiContentGenerationJobData]);

  // useEffect(() => {
  //   if(isOpen) {
  //     scrollToBottom()
  //   }
  // }, [isOpen])

  return (
    <div className={styles['job-container']}>
      <AnimatePresence>
        {aiContentGenerationJobDetails?.generation_state ===
          'complete_generation' &&
          ['pending', 'processing'].includes(aiContentGenerationStatus) &&
          showNotificationModal && (
            <NotifyModal
              jobId={aiContentGenerationJobDetails?.job_id}
              notificationType={'content_gen'}
              content={{ r_title: roadmapTitle, slug: roadmapId }}
            />
          )}
      </AnimatePresence>

      <div className={styles['head']} onClick={() => setIsOpen(!isOpen)}>
        <span
          className={`${styles['head-text']} ${['pending', 'processing', undefined].includes(aiContentGenerationStatus) ? styles['shimmer-text'] : ''}`}
        >
          {['pending', 'processing'].includes(aiContentGenerationStatus) ? (
            `${Math.round(aiContentGenerationJobData?.percentage || 0)}% Content Generation Done`
          ) : aiContentGenerationStatus === 'complete' ? (
            aiContentGenerationJobDetails?.generation_state ===
            'partial_generation' ? (
              <span>
                Content is generated for{' '}
                <span className={styles['module-name']}>
                  {getNode(aiContentGenerationJobData?.job_status[0]?.node_id)
                    ?.data?.label || 'Unknown Module'}
                </span>{' '}
                ,{' '}
                <a
                  href=""
                  onClick={(e) =>
                    handleModuleView(
                      e,
                      aiContentGenerationJobData?.job_status[0]?.children[0]
                        ?.node_id,
                    )
                  }
                  className={styles['view-here-a']}
                >
                  view here
                </a>
                . Proceed with creating remaining content?{' '}
              </span>
            ) : aiContentGenerationJobDetails?.generation_state ===
              'complete_generation' ? (
              'Generation Complete'
            ) : (
              'Content Generation Complete'
            )
          ) : aiContentGenerationStatus === 'failed' ? (
            'Content Generation Failed'
          ) : (
            'No Content in Roadmap'
          )}
        </span>

        {/* <div className={styles['progress-info']}> */}
        {/* {(aiContentGenerationJobData?.overall_status === 'complete' ||
            aiContentGenerationJobData?.overall_status === 'failed') && (
            <span className={styles['time-elaspsed']}>
              {aiContentGenerationJobData?.total_time_elapsed ? aiContentGenerationJobData?.total_time_elapsed :getElapsedTime(
                aiContentGenerationJobData.created_at,
                aiContentGenerationJobData.updated_at,
              )}
            </span>
          )}
          {
            aiContentGenerationStatus &&
          <span
          className={`${styles['progress-percentage']} ${
              aiContentGenerationStatus === 'complete'
                ? styles['complete']
                : aiContentGenerationStatus === 'processing'
                  ? styles['processing']
                  : aiContentGenerationStatus === 'pending'
                    ? styles['pending']
                    : aiContentGenerationStatus === 'failed'
                      ? styles['failed']
                      : ''
            }`}
          >
            {Math.round(aiContentGenerationJobData?.percentage || 0)}% Done
          </span>
          } */}
        {roadmapGenerationMode === 'ai-generated' &&
          roadmapAccessLevel === 'owner' &&
          (aiContentGenerationStatus === 'failed' ||
            !aiContentGenerationJobDetails ||
            (aiContentGenerationJobDetails?.generation_state ===
              'partial_generation' &&
              aiContentGenerationStatus === 'complete')) && (
            <div
              className={styles['button-wrapper']}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant={'primary'}
                size={'sm'}
                disabled={
                  isActiveApiCall ||
                  isAiContentGenerationJobRunning ||
                  (['complete'].includes(aiContentGenerationStatus) &&
                    aiContentGenerationJobDetails?.generation_state ===
                      'complete_generation')
                }
                onClick={handleGenerateButtonClick}
                className={styles['generate-content-btn']}
              >
                <span>
                  {['pending', 'processing'].includes(aiContentGenerationStatus)
                    ? 'Generation In Progress'
                    : aiContentGenerationStatus === 'complete'
                      ? aiContentGenerationJobDetails?.generation_state ===
                        'partial_generation'
                        ? 'Proceed'
                        : aiContentGenerationJobDetails?.generation_state ===
                            'complete_generation'
                          ? 'Generation Complete'
                          : 'Generation Complete'
                      : aiContentGenerationStatus === 'failed'
                        ? 'Retry'
                        : 'Generate Content'}
                </span>
              </Button>

              {/* Content Type Popup */}
              <AnimatePresence>
                {showContentTypePopup && (
                  <motion.div
                    className={styles['content-type-popup']}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles['popup-header']}>
                      <span>Select Content Type</span>
                      <button
                        className={styles['popup-close-btn']}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowContentTypePopup(false);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles['popup-options']}>
                      <button
                        className={styles['popup-option']}
                        onClick={(e) => handleContentTypeSelection(e, 'public')}
                      >
                        Public Content
                      </button>
                      <button
                        className={styles['popup-option']}
                        onClick={(e) =>
                          handleContentTypeSelection(e, 'licensed')
                        }
                      >
                        Licensed Content
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        {/* </div> */}
      </div>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className={styles['status-container']}
              key="dropdown"
              ref={containerRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {(aiContentGenerationJobData.job_status || []).map(
                (js, index) => {
                  const parentNode = getNode(js.node_id);
                  return (
                    <div key={index} className={styles['parent-node-ct']}>
                      <span className={styles['timeline-badge']}></span>
                      <div className={styles['parent-node-content']}>
                        <div className={styles['parent-node-head']}>
                          <span>
                            {parentNode?.data?.label || 'Unknown Node'}
                          </span>
                          <div
                            className={`${styles['status-ct']} ${
                              js?.status === 'complete'
                                ? styles['complete']
                                : js?.status === 'processing'
                                  ? styles['processing']
                                  : js?.status === 'pending'
                                    ? styles['pending']
                                    : js?.status === 'failed'
                                      ? styles['failed']
                                      : ''
                            }`}
                          >
                            {getStatusIcon(js?.status || 'pending')}
                            <span>{js?.status || 'pending'}</span>
                          </div>
                        </div>
                        {(js?.children || []).map((jsc, idx) => (
                          <ChildNodeDiv
                            key={idx}
                            roadmapId={roadmapId}
                            data={jsc}
                          />
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
              {Math.round(aiContentGenerationJobData?.percentage || 0) ===
                100 && (
                <div className={styles['done-ct']}>
                  <span className={styles['timeline-badge']}></span>{' '}
                  <div className={styles['done-text']}>Done</div>
                </div>
              )}
            </motion.div>
            {(aiContentGenerationJobData.job_status || []).length !== 0 && (
              <motion.span
                className={styles['content-disclaimer']}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                While this AI-generated roadmap is designed to help you plan
                confidently, it may occasionally make mistakes, so please
                double-check the details to ensure everything fits your needs.
              </motion.span>
            )}
            <AnimatePresence mode="sync">
              {isOpen && showScrollBtn && (
                <motion.button
                  className={styles['scroll-btn']}
                  onClick={scrollToBottom}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.1, ease: 'easeInOut' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m8 18l4 4l4-4M12 2v20"
                    />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const ChildNodeDiv = ({ roadmapId, data }) => {
  const nodes = useRoadmapStore((s) => s.nodes);
  const setSelectedNode = useRoadmapStore((s) => s.setSelectedNode);
  const chapterLearningOrder = useRoadmapStore((s) => s.chapterLearningOrder);
  const setCurrentChapterIndex = useRoadmapStore(
    (s) => s.setCurrentChapterIndex,
  );

  const router = useRouter();
  const {projectId} = useParams()

  const getNode = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? node : {};
  };

  const getUrlDomain = (url) => {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  };

  const shortenText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const node = useMemo(() => {
    return getNode(data?.node_id);
  }, [data]);

  const scrollToNode = (e, nodeId, status) => {
    e.stopPropagation();
    if (status !== 'complete') return; // if node content is generating then do not take to the node
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      const el = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
        setSelectedNode(targetNode);
        if (chapterLearningOrder) {
          setCurrentChapterIndex(
            chapterLearningOrder.findIndex((chapter) => chapter.id === nodeId),
          );
        }
        router.push(`/project/${projectId}/roadmap/${roadmapId}?node=${nodeId}`, { replace: true });
        document.body.style.overflow = 'hidden';
      }
    }
  };

  return (
    <div className={styles['child-node-ct']}>
      <div
        className={styles['cn-head']}
        onClick={(e) => scrollToNode(e, data?.node_id, data?.status)}
      >
        {/* <ProcessingSVG height={'15'} width={'15'} /> */}
        {getStatusIcon(data?.status)}
        <span>{node?.data?.label || 'Unknown Node'}</span>
      </div>
      <div className={styles['cn-links']}>
        {(data?.generation_data?.sites || []).length !== 0 && (
          <p className={styles['cn-links-head']}>Reference Sites Added</p>
        )}
        <div className={styles['cn-links-body']}>
          {(data?.generation_data?.sites || []).map((site, idx) => (
            <a
              key={idx}
              href={site.url}
              className={styles['link-ct']}
              target="_blank"
            >
              <div className={styles['cn-links-img']}>
                <img
                  src={`https://www.google.com/s2/favicons?sz=128&domain=${getUrlDomain(site.url)}`}
                  alt=""
                />
              </div>
              <span>{shortenText(site.title, 30)}</span>
            </a>
          ))}
        </div>
      </div>
      {data?.generation_data?.content_present && (
        <div className={styles['content-gen-skip']}>
          *
          {data?.generation_data?.content_generation_type === 'ai'
            ? 'AI generated content already present'
            : 'Content already present'}
          . AI generation skipped
        </div>
      )}
    </div>
  );
};

const ProcessingSVG = (props) => {
  return (
    <svg
      stroke="#000000"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      height={24}
      width={24}
      {...props}
    >
      <g>
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dasharray"
            dur="1.5s"
            calcMode="spline"
            values="0 150;42 150;42 150;42 150"
            keyTimes="0;0.475;0.95;1"
            keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            dur="1.5s"
            calcMode="spline"
            values="0;-16;-59;-59"
            keyTimes="0;0.475;0.95;1"
            keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
            repeatCount="indefinite"
          />
        </circle>
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="2s"
          values="0 12 12;360 12 12"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
};

const PendingIconSVG = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
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
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="10" />
      </g>
    </svg>
  );
};

const CompleteIconSVG = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
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
        <path d="m9 12l2 2l4-4" />
      </g>
    </svg>
  );
};

const FailedIconSVG = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
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
        <path d="M12 8v4m0 4h.01" />
      </g>
    </svg>
  );
};

export default ContentGenerationJobStatusViewer;
