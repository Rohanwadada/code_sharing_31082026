'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './NodeContentViewer.module.css';
import videoIcon from '@/assets/node-content-viewer/video.svg';
import articleIcon from '@/assets/node-content-viewer/article.svg';
import websiteIcon from '@/assets/node-content-viewer/website.svg';
import liveIcon from '@/assets/node-content-viewer/live.svg';
import documentIcon from '@/assets/node-content-viewer/document.svg';
import databaseIcon from '@/assets/node-content-viewer/database.svg';
import folderIcon from '@/assets/node-content-viewer/folder.svg';
import assignmentIcon from '@/assets/assignment-Icon.svg';
import downloadIcon from '@/assets/node-content-viewer/download.svg';
import pendingIcon from '@/assets/learning-status-icons/pending.svg';
import completeIcon from '@/assets/learning-status-icons/complete.svg';
import inProgressIcon from '@/assets/learning-status-icons/in-progress.svg';
import dropdownIcon from '@/assets/select-element-dropdown-icon.svg';
import closeIcon from '@/assets/close.svg';
import lockIcon from '@/assets/node-content-viewer/lock.svg';
import unLockIcon from '@/assets/node-content-viewer/unlock.svg';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '@/components/utility/Skeleton';
import { v4 as uuidv4 } from 'uuid';
import NodeContentMarkdownRenderer, {
  TypingMarkdown,
} from './NodeContentMarkdownRenderer';
import { useArtifactStore } from '@/store/artifactStore';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRoadmapStore } from '@/store/roadmapStore';
import { getNodeContent as getNodeContentApi } from '@/service/roadmapContent.service';
import { updateLearningProgress } from '@/service/roadmapLearning.service';
import {
  generateNodeContent as generateNodeContentApi,
  generateNodeAssessment as generateNodeAssessmentApi,
} from '@/service/aiContentGeneration.service';
import Button from '../ui/Button';
import { Sparkles } from 'lucide-react';

const MotionImage = motion.create(Image);

/**
 *
 * @param {Object} props - The props object.
 * @param {Object} props.selectedNode - The selected node object.
 * @param {Object} props.learningProgress - The learning progress object.
 * @param {Function} props.setLearningProgress - The function to set the learning progress.
 * @param {Function} props.closePopup - The function to close the popup.
 * @param {Object} props.premiumAccessData - Provide details that user has premium access to the roadmap or not.
 * @param {String} props.roadmapTitle - Roadmap title.
 * @param {Number} props.roadmapPrice - Roadmap price.
 * @param {String} props.roadmapAccessLevel - Access level of the user to the roadmap(owner, editor, viewer).
 * @param {String} props.roadmapGenerationMode - How the roadmap is generated(manual, ai-generated).
 * @param {Array} props.chapterLearningOrder - It is a array of subtopic node according to the learning order.
 * @description This component is used to display the content of a selected node in the roadmap. It shows the title, description, and links associated with the node. It also allows the user to update their learning progress for the node.
 * @returns {JSX.Element} - The rendered component.
 */
const NodeContentViewer = ({
  roadmapId,
  selectedNode,
  learningProgress,
  setLearningProgress,
  closePopup,
  premiumAccessData,
  roadmapTitle,
  roadmapPrice,
  roadmapAccessLevel,
  roadmapGenerationMode,
  chapterLearningOrder,
}) => {
  console.log('Roadmap ID: ', roadmapId);
  console.log('Selected Node: ', selectedNode);

  const userDetails = useAuthStore((s) => s.userDetails);

  const nodes = useRoadmapStore((s) => s.nodes);
  const edges = useRoadmapStore((s) => s.edges);
  const setSelectedNode = useRoadmapStore((s) => s.setSelectedNode);
  const totalRoadmapContent = useRoadmapStore((s) => s.totalRoadmapContent);
  const setTotalRoadmapContent = useRoadmapStore(
    (s) => s.setTotalRoadmapContent,
  );
  const isAiContentGenerationJobRunning = useRoadmapStore(
    (s) => s.isAiContentGenerationJobRunning,
  );
  const currentChapterIndex = useRoadmapStore((s) => s.currentChapterIndex);
  const setCurrentChapterIndex = useRoadmapStore(
    (s) => s.setCurrentChapterIndex,
  );
  const contentCache = useRoadmapStore((s) => s.contentCache);
  const setContentCache = useRoadmapStore((s) => s.setContentCache);

  // State to checking we are making api call to fetch node's content
  const [isContentFetching, setIsContentFetching] = useState(false);
  // State to show the typing animation after content generation
  const [showTypingAnimation, setShowTypingAnimation] = useState(false);
  // State to store node's content
  const [nodeContent, setNodeContent] = useState({});
  // Reference to content container
  const contentContainerRef = useRef(null);
  // Object to get query params
  const searchParams = useSearchParams();
  // Navigation object for navigation
  const router = useRouter();
  // Location object
  const location = usePathname();

  /**
   * useEffect hook to fetch the content of a selected roadmap node from the server.
   *
   * @effect
   * Triggers on every change to `selectedNode`.
   * Sends a GET request to the backend using `roadmapId`, `selectedNode.id`, and `userDetails.email`.
   * Updates local state with the received node content (`title`, `description`, `links`).
   * Handles UI loading state via `setIsContentFetching`.
   *
   * @dependencies [selectedNode]
   *
   * @see setNodeContent - Updates the node content displayed to the user.
   * @see setIsContentFetching - Toggles loading state for UI feedback.
   * @see selectedNode - Node object selected by the user (must contain `id`).
   * @see roadmapId - Identifier for the current roadmap context.
   * @see userDetails.email - User identity passed to the backend for personalized content retrieval.
   */
  useEffect(() => {
    const getNodeContent = async () => {
      try {
        if (selectedNode) {
          // If the content is in cache serve from their
          if (contentCache.get(selectedNode.id)) {
            setNodeContent(contentCache.get(selectedNode.id));
            return;
          }
          setIsContentFetching(true);
          const responseData = await getNodeContentApi(
            roadmapId,
            selectedNode?.id,
          );
          const content = {
            title: responseData?.content?.title || '',
            description: responseData?.content?.description || '',
            links: responseData?.content?.links || [],
            assessment: responseData?.content?.assessment,
          };

          setNodeContent(content);

          // cache only ai generated content not manual one
          if (responseData?.content?.generation_type === 'ai') {
            setContentCache(contentCache.set(selectedNode.id, content));
          }
        }
      } catch (error) {
      } finally {
        setIsContentFetching(false);
      }
    };
    getNodeContent();
  }, [selectedNode]);

  console.debug('[DEBUG]', nodeContent);

  /**
   *
   * @param {String} content_type - It is the type of content, e.g. video, website, course
   * @returns icon according to the content type
   * @example
   * <img src={getContentImageIcon('video')} alt="" />
   */
  const getContentImageIcon = (content_type) => {
    switch (content_type.toLowerCase()) {
      case 'video':
        return videoIcon;
      case 'article':
        return documentIcon;
      case 'course':
        return liveIcon;
      case 'website':
        return websiteIcon;
      case 'opensource':
        return websiteIcon;
      case 'document':
        return documentIcon;
      case 'data_table':
        return databaseIcon;
      case 'folder':
        return folderIcon;
      case 'assignment':
        return assignmentIcon;
      case 'notebook':
        return articleIcon;
    }
  };

  /**
   * Fucntion to handle buy content button click
   * Not using right now but will be used later
   */
  const handleBuyContentButtonClick = () => {
    router.push(`/pay`, {
      state: {
        price: roadmapPrice,
        roadmapId: roadmapId,
        roadmap_title: roadmapTitle,
        redirectTo: location,
      },
    });
  };

  const generateNodeContent = async () => {
    const toastId = uuidv4();
    try {
      if (selectedNode) {
        setIsContentFetching(true);

        const parent_module = nodes.find((n) => n.id === selectedNode.parentId);
        const parent_topic = edges
          .filter(
            (edge) =>
              edge.source === parent_module?.id ||
              edge.target === parent_module?.id,
          )
          .map((edge) =>
            edge.source === parent_module?.id ? edge.target : edge.source,
          )
          .map((id) => nodes.find((node) => node.id === id))
          .find((node) => ['topic', 'topicGroup'].includes(node?.type));

        console.debug('[Parent Module]: ', parent_module);
        console.debug('[Parent Topic]: ', parent_topic);
        const data = {
          r_id: roadmapId,
          m_id: parent_module?.id,
          n_id: selectedNode?.id,
          roadmap: roadmapTitle,
          topic_name: parent_topic?.data?.label,
          module_name: parent_module?.data?.label,
          node_title: selectedNode?.data?.label,
        };
        // console.log("Data: ", data)
        const responseData = await generateNodeContentApi(data);
        setNodeContent({
          title: responseData?.content?.title || '',
          description: responseData?.content?.description || '',
          links: responseData?.content?.links || [],
          assessment: responseData?.content?.assessment,
        });
        setShowTypingAnimation(true);
        // update the total content count
        setTotalRoadmapContent(
          totalRoadmapContent + (responseData?.content?.links || []).length,
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsContentFetching(false);
    }
  };

  const generateNodeAssessment = async () => {
    const toastId = uuidv4();
    try {
      if (selectedNode) {
        setIsContentFetching(true);
        const data = {
          roadmap_id: roadmapId,
          roadmap: roadmapTitle,
          module_id: selectedNode?.parentId
            ? nodes.find((n) => n.id === selectedNode.parentId)?.id
            : '',
          node_id: selectedNode?.id,
        };
        const type = !selectedNode?.parentId ? 'final_assessment' : 'module';
        const responseData = await generateNodeAssessmentApi(data, type);
        setNodeContent({
          assessment: responseData?.assessment,
        });
      }
    } catch (error) {
    } finally {
      setIsContentFetching(false);
    }
  };

  /**
   * Tells if button is disabled according to the `currentChapterIndex`
   * @param {String} direction navigating to which direction(previous | next).
   * @returns `True` if the direction is `previous` and in 0th index, if direction is `next` and in n-1th index, Otherwise `False`
   */
  const isChapterChangeButtonDisabled = (direction) => {
    return direction === 'previous'
      ? currentChapterIndex === 0
      : currentChapterIndex >= chapterLearningOrder.length - 1;
  };

  /**
   * Change chapter according to the button click
   * @param {String} direction navigating to which direction(previous | next).
   */
  const changeChapter = (direction) => {
    let newChapter = null;
    if (direction === 'previous' && currentChapterIndex - 1 >= 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      newChapter = chapterLearningOrder[currentChapterIndex - 1];
      setSelectedNode(newChapter);
    } else if (
      direction === 'next' &&
      currentChapterIndex + 1 < chapterLearningOrder.length
    ) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      newChapter = chapterLearningOrder[currentChapterIndex + 1];
      setSelectedNode(newChapter);
    }
    // if (newChapter) {
    //   const newParams = new URLSearchParams(searchParams);
    //   newParams.set("node", newChapter.id);
    //   router.push(`${location}?${newParams.toString()}`, {
    //     replace: true,
    //   });
    // }
  };

  /**
   * This scrolls to the content top as soon as the chapter changes
   */
  useEffect(() => {
    if (contentContainerRef.current) {
      const parent = contentContainerRef.current.parentElement;
      if (parent) {
        parent.scrollTop = 0;
      }
    }
  }, [currentChapterIndex]);

  const showAiContentGenComponent =
    selectedNode?.type === 'subtopic' &&
    nodeContent?.title === '' &&
    nodeContent?.description === '' &&
    nodeContent?.links.length === 0 &&
    roadmapAccessLevel === 'owner' &&
    roadmapGenerationMode === 'ai-generated' &&
    !isAiContentGenerationJobRunning;

  const showAiAssessmentGeneration =
    selectedNode?.type === 'assignmentNode' &&
    selectedNode?.data?.semanticType === 'assessment' &&
    !nodeContent?.assessment &&
    roadmapAccessLevel === 'owner';
  !isAiContentGenerationJobRunning;

  return (
    <div className={styles['node-content-viewer']} ref={contentContainerRef}>
      {isContentFetching ? (
        <NodeContentViewerSkeletonLoader />
      ) : showAiContentGenComponent ? (
        <AiNodeContentGenerator
          selectedNode={selectedNode}
          handleGenerateContentCLick={generateNodeContent}
          handleCloseCLick={closePopup}
          headingText={'Create content by Shifu'}
          description={"Let's Shifu craft your content"}
          ctaText={'Generate'}
        />
      ) : showAiAssessmentGeneration ? (
        <AiNodeContentGenerator
          selectedNode={selectedNode}
          handleGenerateContentCLick={generateNodeAssessment}
          handleCloseCLick={closePopup}
          headingText={'Create assessment by Shifu'}
          description={
            'Shifu will scan through all  of the module chapters and generate a comprehensive assessment for the module'
          }
          ctaText={'Generate'}
        />
      ) : (
        <>
          <div className={styles['top']}>
            {/* <img src={setuLogo} alt="" /> */}
            {/* <img src={menuIcon} alt="" /> */}
            {['subtopic', 'assignmentNode'].includes(selectedNode?.type) && (
              <ProgressStatusDropDown
                selectedNode={selectedNode}
                learningProgress={learningProgress}
                setLearningProgress={setLearningProgress}
                userDetails={userDetails}
                roadmapId={roadmapId}
                readOnly={selectedNode?.type === 'assignmentNode'}
              />
            )}

            <button className={styles['close-button']} onClick={closePopup}>
              <Image src={closeIcon} alt="" />
            </button>
          </div>

          {['subtopic'].includes(selectedNode?.type) && (
            <div className={styles['node-content-ct']}>
              <div className={styles['content-head']}>
                <p className={styles['node-title']}>
                  {nodeContent?.title || 'No Title Provided'}
                </p>
                <div className={styles['node-description']}>
                  {showTypingAnimation ? (
                    <TypingMarkdown
                      text={
                        nodeContent?.description || 'No description provided'
                      }
                      speed={10}
                    />
                  ) : (
                    <NodeContentMarkdownRenderer
                      content={
                        nodeContent?.description || 'No description provided'
                      }
                    />
                  )}
                  {/* <TypingMarkdown text={nodeContent?.description || 'No description provided'} speed={10} /> */}
                </div>
              </div>

              {['subtopic'].includes(selectedNode?.type) && (
                <>
                  <div className={styles['open-access']}>
                    <div className={styles['open-access-heading']}>
                      <p className={styles['open-access-p']}>Open Access</p>
                      <div className={styles['open-access-hr']}></div>
                    </div>

                    <div className={styles['open-access-contents']}>
                      {nodeContent?.links &&
                        (nodeContent?.links.filter(
                          (link) => link.accessType === 'public',
                        ).length === 0 ? (
                          <div className={styles['node-description']}>
                            {' '}
                            <p>No content available</p>{' '}
                          </div>
                        ) : (
                          nodeContent?.links
                            .filter((link) => link.accessType === 'public')
                            .map(
                              (link, index) =>
                                link?.accessType === 'public' && (
                                  <div
                                    className={styles['contents-ct']}
                                    key={index}
                                  >
                                    <div
                                      className={styles['contents']}
                                      key={index}
                                    >
                                      <Image
                                        src={getContentImageIcon(link?.type)}
                                        alt=""
                                      />
                                      <a href={link?.url} target="_blank">
                                        {link?.title ||
                                          'No title Provided'}{' '}
                                      </a>
                                    </div>
                                    {link?.downloadable && (
                                      <Image
                                        src={downloadIcon}
                                        alt="downloadable"
                                        title="downloadable"
                                      />
                                    )}
                                  </div>
                                ),
                            )
                        ))}
                    </div>
                  </div>
                </>
              )}

              {nodeContent?.assessment && (
                <div className={styles['assessment-section']}>
                  <div className={styles['assessment-section-heading']}>
                    <p className={styles['assessment-section-p']}>Assessment</p>
                    <div className={styles['assessment-section-hr']}></div>
                  </div>

                  <div className={styles['assessment-section-contents']}>
                    <div className={styles['contents-ct']}>
                      <div className={styles['contents']}>
                        <Image src={getContentImageIcon('assignment')} alt="" />
                        <a
                          href={
                            learningProgress[selectedNode?.id]?.assessment
                              ?.status === 'complete'
                              ? `/assessment/result/${learningProgress[selectedNode?.id]?.assessment.allocation_id}`
                              : nodeContent.assessment?.url
                          }
                          target="_blank"
                        >
                          {nodeContent.assessment?.name ||
                            'Untitled Assessment'}{' '}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedNode?.type === 'assignmentNode' && (
            <AssignmentNodeContentViewer
              node={selectedNode}
              nodeContent={nodeContent}
              learningProgress={learningProgress}
            />
          )}
        </>
      )}

      <div className={styles['navigation-btn-ct']}>
        <button
          className={`${styles['navigation-btn']} ${styles['previous']}`}
          disabled={isChapterChangeButtonDisabled('previous')}
          onClick={() => changeChapter('previous')}
        >
          <ArrowLeft />
          <span>Previous</span>
        </button>

        <button
          className={`${styles['navigation-btn']} ${styles['next']}`}
          disabled={isChapterChangeButtonDisabled('next')}
          onClick={() => changeChapter('next')}
        >
          <span>Next</span>
          <ArrowRight />
        </button>
      </div>
    </div>
  );
};

/**
 *
 * @param {Object} props - The props object.
 * @param {Object} props.selectedNode - The selected node object.
 * @param {Object} props.learningProgress - The learning progress object.
 * @param {Function} props.setLearningProgress - The function to set the learning progress.
 * @param {Function} props.userDetails - The object of user details which @see Usercontext.jsx.
 * @description This component is used to display the status of the current learning status of that node. User can update it from a dropdow. It has three options - pending, in progress and done.
 * @returns {JSX.Element} - The rendered component.
 */
export const ProgressStatusDropDown = ({
  selectedNode,
  learningProgress,
  setLearningProgress,
  userDetails,
  roadmapId,
  readOnly = false,
}) => {
  // List of progress options
  const progressStatusList = [
    { value: 'pending', label: 'Pending', icon: pendingIcon },
    { value: 'in-progress', label: 'In Progress', icon: inProgressIcon },
    { value: 'done', label: 'Done', icon: completeIcon },
  ];

  // Animation variants
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  const arrowVariants = {
    open: { rotate: 180 },
    closed: { rotate: 0 },
  };

  // Context to set the count of completed content from api call. Server will seeeeeend the completed content count after a node marked as complete
  const setContentCompleted = useRoadmapStore((s) => s.setContentCompleted);
  // State to check dropdown open or not
  const [isOpen, setIsOpen] = useState(false);
  // Current progress status
  const [progressStatus, setProgressStatus] = useState(progressStatusList[0]);
  // Reference to progress dropdown
  const progressStatusDropdownRef = useRef(null);

  /**
   *
   * @param {String} nodeId Selected node's id
   * @param {Object} status Learning status to be updated
   * @description This function updates the learning status of a node in the server. It sends a PATCH request to the server with the updated status.
   */
  const updateLearningStatus = async (e, nodeId, status) => {
    e.stopPropagation();
    const oldStatus = progressStatus;
    const newStatus = status.value;
    const data = {
      id: nodeId,
      status: newStatus,
    };
    setProgressStatus(status);
    setIsOpen(false);

    try {
      const responseData = await updateLearningProgress(roadmapId, data);
      // setProgressStatus(status);
      const currentTime = new Date().toISOString();
      setLearningProgress({
        ...learningProgress,
        [selectedNode?.id]: {
          ...(learningProgress[selectedNode?.id] || {
            started_at: currentTime,
          }),
          status: newStatus,
          updated_at: currentTime,
        },
      });
      setContentCompleted(responseData?.content_completed);
    } catch (error) {
      console.error(error);
      setProgressStatus(oldStatus);
    }
  };

  // Function to open and close fropdown
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (readOnly) return;
    setIsOpen(!isOpen);
  };

  // useEffect to set learning status when `selectedNode` changes
  useEffect(() => {
    const learningStatus =
      learningProgress[selectedNode?.id]?.status || 'pending';
    setProgressStatus(
      progressStatusList.find((ps) => ps.value === learningStatus),
    );
  }, [selectedNode]);

  // It adds event listner to the dropdown to close when click outside of dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        progressStatusDropdownRef.current &&
        !progressStatusDropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      className={styles['dropdown-container']}
      ref={progressStatusDropdownRef}
    >
      <div
        className={`${styles['dropdown-header']} ${isOpen ? styles['dropdown-open'] : ''}`}
        onClick={toggleDropdown}
      >
        <div className={styles['selected-option']}>
          <div className={styles['progress-st-ct']}>
            <Image src={progressStatus?.icon} alt="" />
            <span className={styles['progress-label']}>
              {progressStatus?.label}
            </span>
          </div>
          {!readOnly && (
            <div className={styles['update-status']}>
              <span className={styles['update-status-text']}>
                Update Status
              </span>
              <MotionImage
                src={dropdownIcon}
                alt=""
                animate={isOpen ? 'open' : 'closed'}
                variants={arrowVariants}
                transition={{ duration: 0.2 }}
              />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles['dropdown-options']}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={dropdownVariants}
          >
            {progressStatusList
              .filter((option) => option.value !== progressStatus.value)
              .map((option) => (
                <div
                  key={option.value}
                  className={styles['dropdown-option']}
                  onClick={(e) =>
                    updateLearningStatus(e, selectedNode?.id, option)
                  }
                  transition={{ duration: 0.1 }}
                >
                  <div className={styles['progress-st-ct']}>
                    <Image src={option?.icon} alt="" />
                    <span className={styles['progress-label']}>
                      {option?.label}
                    </span>
                  </div>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 *
 * @param {Object} props - The props object.
 * @param {Object} props.className - css className for styling
 * @returns SVG image for left arrrow
 */
const ArrowLeft = ({ className }) => {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.625 13.125L2.5 10M2.5 10L5.625 6.875M2.5 10H17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 *
 * @param {Object} props - The props object.
 * @param {Object} props.className - css className for styling
 * @returns SVG image for right arrrow
 */
const ArrowRight = ({ className }) => {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.375 6.875L17.5 10M17.5 10L14.375 13.125M17.5 10H2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const AssignmentNodeContentViewer = ({
  node,
  nodeContent,
  learningProgress,
}) => {
  const assessment = nodeContent?.assessment;
  const assessmentName =
    assessment?.name || node?.data?.label || 'Untitled Assessment';
  const assessmentUrl = assessment?.url;

  const isAssessmentComplete =
    learningProgress[node?.id]?.assessment?.status === 'complete';
  const asssessmentResultUrl = `/assessment/result/${learningProgress[node?.id]?.assessment.allocation_id}`;

  return (
    <div
      className={styles['assignment-viewer']}
      role="region"
      aria-label={`Assessment: ${assessmentName}`}
    >
      <div className={styles['assignment-card']}>
        <div className={styles['assignment-icon-ct']} aria-hidden="true">
          <Image src={assignmentIcon} alt="" width={28} height={28} />
        </div>

        <span className={styles['assignment-eyebrow']}>Assessment</span>

        <h3 className={styles['assignment-name']}>{assessmentName}</h3>

        <p className={styles['assignment-caption']}>
          Complete the assessment to test what you have learned.
        </p>

        <div className={styles['assignment-divider']} />

        {assessmentUrl ? (
          <a
            href={isAssessmentComplete ? asssessmentResultUrl : assessmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles['assignment-cta']}
            aria-label={`Start assessment: ${assessmentName}`}
          >
            <span>
              {isAssessmentComplete ? 'View Result' : 'Take Assessment'}
            </span>
            <ArrowRight className={styles['assignment-cta-arrow']} />
          </a>
        ) : (
          <p className={styles['assignment-unavailable']} role="status">
            This assessment is not available yet.
          </p>
        )}
      </div>
    </div>
  );
};

const AiNodeContentGenerator = ({
  selectedNode,
  handleGenerateContentCLick,
  handleCloseCLick,
  headingText = 'Generate by AI',
  description = 'Let&apos;s Shifu craft your content',
  ctaText = 'Generate',
}) => {
  return (
    <div className={styles['ai-generate-content-ct']}>
      <div className={styles['aigc-top']}>
        <button className={styles['close-button']}>
          <Image src={closeIcon} onClick={handleCloseCLick} alt="" />
        </button>
      </div>
      <div className={styles['node-title']}>
        {selectedNode?.data?.label || 'No Title Provided'}
      </div>
      <div className={styles['aigc-bottom']}>
        <div className={styles['aigc-t-head']}>
          <p className={styles['aigc-t-head-text']}>{headingText}</p>
          <p className={styles['aigc-t-secondary-text']}>{description}</p>
        </div>
        <div className={styles['ai-generate-content-btn-wrapper']}>
          <Button
            variant="primary"
            // size='md'
            className={styles['ai-generate-content-btn']}
            onClick={handleGenerateContentCLick}
            leftIcon={<Sparkles />}
          >
            {/* ✨ Generate*/}
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NodeContentViewerSkeletonLoader = () => {
  return (
    <>
      <div className={styles['top']}>
        <Skeleton height={43} width={254} />
        <Skeleton height={34} width={34} />
      </div>
      <div className={styles['node-content-ct']}>
        <div className={styles['content-head']}>
          <Skeleton height={64} width={'100%'} />
          <Skeleton height={10} width={'100%'} count={5} gap={1} />
        </div>
        <div className={styles['open-access']}>
          <div className={styles['open-access-heading']}>
            <Skeleton height={33} width={120} />
            <Skeleton height={2} width={'100%'} />
          </div>
          <div className={styles['open-access-contents']}>
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className={styles['contents']}>
                  <Skeleton variant="avatar" />
                  <Skeleton height={30} width={'100%'} />
                </div>
              ))}
          </div>
        </div>
        <div className={styles['open-access']}>
          <div className={styles['open-access-heading']}>
            <Skeleton height={33} width={120} />
            <Skeleton height={2} width={'100%'} />
          </div>
          <div className={styles['open-access-contents']}>
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className={styles['contents']}>
                  <Skeleton variant="avatar" />
                  <Skeleton height={30} width={'100%'} />
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default NodeContentViewer;
