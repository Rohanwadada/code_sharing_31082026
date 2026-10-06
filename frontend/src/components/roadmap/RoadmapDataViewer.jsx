'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import EdgeMarkers from '../shared/EdgeMarkers';
import styles from './RoadmapDataViewer.module.css';
import RoadmapSVGViewer from './RoadmapSVGViewer';
import html2canvas from 'html2canvas';
import zoomInIcon from '@/assets/roadmap-screen/zoom-in.svg';
import zoomOutIcon from '@/assets/roadmap-screen/zoom-out.svg';
import { addCopyright } from '@/utils/helper';
import { AnimatePresence, motion } from 'framer-motion';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import Skeleton from '@/components/utility/Skeleton';
import { useNotification } from '@/hooks/useNotification';
import { v4 as uuid4 } from 'uuid';
import jsPDF from 'jspdf';
import RoadmapModuleView from './RoadmapModuleView';
import NodeContentViewer from './NodeContentViewer';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRoadmapStore } from '@/store/roadmapStore';
import ContentGenerationJobStatusViewer from './ContentGenerationJobStatusViewer';
import CourseRecommendation from './CourseRecommendation';
import FloatingBot from '../doubt-solver/FloatingBot';
import DoubtSolver from '../doubt-solver/DoubtSolver';
import { useDoubtSolverThreadStore } from '@/store/doubtSolverThreadStore';
import downloadIcon from '@/assets/roadmap-screen/download.svg';
import refreshIcon from '@/assets/roadmap-screen/refresh-icon.svg';
import backIcon from '@/assets/roadmap-screen/back-icon-black.svg';
import editIcon from '@/assets/edit-icon.svg';
import { ADMIN_ROLE } from '@/utils/constants';
import { getRoadmapById } from '@/service/roadmap.service';
import { getLearningProgress } from '@/service/roadmapLearning.service';

/**
 * @component RoadmapDataViewer
 * @param {Object} props - The props object.
 * @param {String} props.mode - Denotes the mode of the roadmap screen. For creators roadmap screen can be preview and for other users it will be live (default value).
 * @description This component is used to render the roadmap screen. It contains the roadmap graph and the node content viewer. It renders generated SVG from the roadmap graph and allows the user to view the content of each node by clicking on it. It also fetches the roadmap data and user learning progress from the server.
 * @returns {JSX.Element}
 */
const RoadmapDataViewer = ({ mode = 'live', roadmapId = null, projectId }) => {
  // User details from authStore
  const userDetails = useAuthStore((s) => s.userDetails);
  // Client roadmap details from roadmapStore
  const setCurrentRoadmapId = useRoadmapStore((s) => s.setRoadmapId);
  const nodes = useRoadmapStore((s) => s.nodes);
  const setNodes = useRoadmapStore((s) => s.setNodes);
  const edges = useRoadmapStore((s) => s.edges);
  const setEdges = useRoadmapStore((s) => s.setEdges);
  const roadmapGenerationMode = useRoadmapStore((s) => s.roadmapGenerationMode);
  const setRoadmapGenerationMode = useRoadmapStore(
    (s) => s.setRoadmapGenerationMode,
  );
  const roadmapAccessLevel = useRoadmapStore((s) => s.roadmapAccessLevel);
  const setRoadmapAccessLevel = useRoadmapStore((s) => s.setRoadmapAccessLevel);
  const learningProgress = useRoadmapStore((s) => s.learningProgress);
  const setLearningProgress = useRoadmapStore((s) => s.setLearningProgress);
  const setContentCompleted = useRoadmapStore((s) => s.setContentCompleted);
  const roadmapTitle = useRoadmapStore((s) => s.roadmapTitle);
  const setRoadmapTitle = useRoadmapStore((s) => s.setRoadmapTitle);
  const setIsBookmarked = useRoadmapStore((s) => s.setIsBookmarked);
  const setTotalRoadmapContent = useRoadmapStore(
    (s) => s.setTotalRoadmapContent,
  );
  const setGrossRoadmapContent = useRoadmapStore(
    (s) => s.setGrossRoadmapContent,
  );
  const premiumAccessData = useRoadmapStore((s) => s.premiumAccessData);
  const setPremiumAccessData = useRoadmapStore((s) => s.setPremiumAccessData);
  const roadmapPrice = useRoadmapStore((s) => s.roadmapPrice);
  const setRoadmapPrice = useRoadmapStore((s) => s.setRoadmapPrice);
  const selectedNode = useRoadmapStore((s) => s.selectedNode);
  const setSelectedNode = useRoadmapStore((s) => s.setSelectedNode);
  const isRoadmapFetching = useRoadmapStore((s) => s.isRoadmapFetching);
  const setIsRoadmapFetching = useRoadmapStore((s) => s.setIsRoadmapFetching);
  const setAiContentGenerationJobDetails = useRoadmapStore(
    (s) => s.setAiContentGenerationJobDetails,
  );
  const setRoadmapGenerationPrompt = useRoadmapStore(
    (s) => s.setRoadmapGenerationPrompt,
  );
  const currentRoadmapView = useRoadmapStore((s) => s.currentRoadmapView);
  const setCurrentRoadmapView = useRoadmapStore((s) => s.setCurrentRoadmapView);
  const setCourseRecommendationJobDetails = useRoadmapStore(
    (s) => s.setCourseRecommendationJobDetails,
  );
  // const chapterLearningOrder = useRoadmapStore((s) => s.getChapterLearningOrder());
  const setCurrentChapterIndex = useRoadmapStore(
    (s) => s.setCurrentChapterIndex,
  );
  const modalScrollOffset = useRoadmapStore((s) => s.modalScrollOffset);
  const courseRecommendations = useRoadmapStore((s) => s.courseRecommendations);

  const resetRoadmapStore = useRoadmapStore((s) => s.reset);

  const isDoubtSolverSectionOpen = useDoubtSolverThreadStore((s) => s.isOpen);
  const resetDoubtSolverThreadStore = useDoubtSolverThreadStore((s) => s.reset);

  const [nodeData, setNodeData] = useState({});

  // This custom hook give the current window width of the user
  const { width, isMobile } = useWindowDimensions();
  // Custom hook to show notifications
  const { showLoadingNotification, resolveNotification, rejectNotification } =
    useNotification();
  // Object ot get query params
  const searchParams = useSearchParams();
  // Navigation function to navigate arround routes
  const router = useRouter();
  const location = usePathname();
  // Roadmap container reference
  const roadmapContainerRef = useRef(null);

  /**
   * Fetches the roadmap data from the backend and updates the local state with nodes, edges, and metadata.
   *
   * @async
   * @function fetchRoadmapData
   * @description
   * Initiates a request to the server to retrieve full roadmap details, including the nodes, edges, title, price, and premium access data.
   * Sets these values in the component state and updates the page title.
   * If the request fails, redirects the user to the homepage.
   *
   * @returns {Promise<void>}
   *
   * @see setNodes - Sets the graph nodes for the roadmap.
   * @see setEdges - Sets the graph edges for the roadmap.
   * @see setRoadmapTitle - Sets the roadmap title.
   * @see setPremiumAccessData - Sets premium access data (e.g., paywall logic).
   * @see setRoadmapPrice - Sets the price for the roadmap.
   * @see setTotalRoadmapContent - Tracks total content for progress display.
   * @see setIsBookmarked - Sets whether the roadmap is bookmarked by the user.
   * @see router - Redirects user to the homepage if the fetch fails.
   */
  const fetchRoadmapData = async () => {
    try {
      setIsRoadmapFetching(true);
      const responseData = await getRoadmapById(roadmapId);
      setNodes(
        responseData?.g_data?.nodes.map((node) => ({
          ...node,
          selected: false,
        })),
      );
      setEdges(responseData?.g_data?.edges);
      setRoadmapTitle(responseData?.title);
      setPremiumAccessData(responseData?.premium_access);
      setRoadmapPrice(responseData?.price);
      setTotalRoadmapContent(responseData?.total_content || 0);
      setGrossRoadmapContent(responseData?.gross_content || 0);
      setIsBookmarked(responseData?.is_bookmarked || false);
      setRoadmapGenerationMode(responseData?.mode || 'manual');
      setRoadmapAccessLevel(responseData?.access || 'viewer');
      setAiContentGenerationJobDetails(
        responseData?.content_generation || null,
      );
      setRoadmapGenerationPrompt(responseData?.prompt || null);
      if (responseData?.course_recommendation) {
        setCourseRecommendationJobDetails(responseData.course_recommendation);
      }

      setIsRoadmapFetching(false);
    } catch (err) {
      console.error(err);
      router.push('/');
    }
  };

  /**
   * Fetches the user's learning progress for the specified roadmap.
   *
   * @async
   * @function fetchUserLearningProgress
   * @description
   * Sends a request to the server to get the learning progress for the current user on a specific roadmap.
   * Updates the learning progress and content completion in the state.
   *
   * @returns {Promise<void>}
   *
   * @see setLearningProgress - Updates the learning progress state.
   * @see setContentCompleted - Tracks the number of content pieces completed by the user.
   */
  const fetchUserLearningProgress = async () => {
    try {
      const responseData = await getLearningProgress(roadmapId);
      setLearningProgress(responseData?.learning_progress);
      setContentCompleted(responseData?.content_completed || 0);
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Handles the node click interaction on the roadmap.
   *
   * @function handleNodeClick
   * @description
   * This function is triggered when a user clicks on a node within the roadmap. If the node type is not one of the following:
   * - 'paragraph'
   * - 'title'
   * - 'subtopicGroup'
   * It sets the clicked node as the selected node and routes to the specific node's URL, updating the browser history without reloading.
   *
   * @param {Object} node - The node object that was clicked.
   * @param {string} node.id - The unique identifier of the node.
   * @param {string} node.type - The type of the node (used to filter valid node clicks).
   */
  const handleNodeClick = (node) => {
    if (
      ['title', 'topic', 'topicGroup', 'subtopicGroup'].includes(node?.type)
    ) {
      return;
    }
    setSelectedNode(node);

    // url params changes
    if (chapterLearningOrder) {
      setCurrentChapterIndex(
        chapterLearningOrder.findIndex((chapter) => chapter.id === node.id),
      );
    }
    // const baseURL =
    //   mode === 'preview' ? `/preview/${roadmap_id}` : `/roadmap/${roadmap_id}`;
    // const newParams = new URLSearchParams(searchParams);
    // newParams.set('node', node.id);
    // router.push(`${baseURL}?${newParams.toString()}`, { replace: true });
    // document.body.style.overflow = 'hidden';
  };

  /**
   * Closes the popup and resets the selected node.
   *
   * @function closePopup
   * @description
   * This function is triggered when a user decides to close the node popup. It resets the selected node state and routess
   * to the roadmap without the node query in the URL but do not add to browser history stack.
   */
  const closePopup = () => {
    setSelectedNode(null);

    // url params changes
    // const baseURL =
    //   mode === 'preview' ? `/preview/${roadmap_id}` : `/roadmap/${roadmap_id}`;
    // const newParams = new URLSearchParams(searchParams);
    // newParams.delete('node');
    // const finalURL = newParams.toString()
    //   ? `${baseURL}?${newParams.toString()}`
    //   : baseURL;
    // router.push(finalURL, { replace: true });
    // document.body.style.overflow = 'auto';
  };

  /**
   * Refreshes the roadmap data and user progress when the refresh button is clicked.
   *
   * @async
   * @function onRefreshButtonClick
   * @description
   * This function triggers a refresh of the roadmap data and user learning progress, showing a loading notification while
   * the data is being fetched and resolving it with a success notification once complete.
   *
   * @returns {Promise<void>} - Resolves after data fetching and updates.
   */
  const onRefreshButtonClick = async () => {
    const toastId = uuid4();
    showLoadingNotification(toastId, 'Updating Preview');

    await fetchRoadmapData();
    await fetchUserLearningProgress();

    resolveNotification(toastId, 'Preview updated!!');
  };

  /**
   * Initializes the fetching of roadmap data and user progress on component mount and when `roadmap_id` changes.
   *
   * @function useLayoutEffect
   * @description
   * This hook is triggered on the initial load and whenever the `roadmap_id` changes, fetching both the roadmap data
   * and user progress via the `fetchRoadmapData` and `fetchUserLearningProgress` functions.
   */
  useLayoutEffect(() => {
    if (roadmapId) {
      resetRoadmapStore();
      resetDoubtSolverThreadStore();
      fetchRoadmapData();
      fetchUserLearningProgress();
      setCurrentRoadmapId(roadmapId);
    }
  }, [roadmapId]);
  /**
   * Handles the URL query string to check if a node ID exists, and scrolls to and selects the node if found.
   *
   * @function useEffect
   * @description
   * This effect checks for a `node` query parameter in the URL when the `nodes` array is updated. If a node ID is found,
   * it locates the node in the list and scrolls to it in the view, selecting the node. The effect runs whenever `nodes`
   * changes.
   */
  useEffect(() => {
    const node_id = searchParams.get('node');
    const currentTab = searchParams.get('tab');
    if (node_id && currentTab !== 'list') {
      const node = nodes.find((n) => n.id == node_id);
      if (node) {
        if (['subtopic', 'assignmentNode'].includes(node.type)) {
          const el = document.querySelector(`[data-node-id="${node_id}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus?.();
          }
          setSelectedNode(node);
        } else {
          router.push(`${location}`, { replace: true });
        }
      }
    }
  }, [nodes]);

  /**
   * Polls the server every 10 seconds to refresh the roadmap and user learning progress when in "preview" mode.
   *
   * @function useEffect
   * @description
   * When the mode is 'preview', this effect sets an interval to periodically refresh the roadmap preview by calling
   * `onRefreshButtonClick` every 10 seconds. It cleans up the interval when the component is unmounted.
   */
  useEffect(() => {
    if (mode === 'preview') {
      // polling
      const intervalId = setInterval(() => {
        fetchRoadmapData();
        fetchUserLearningProgress();
      }, 10000);
      return () => clearInterval(intervalId);
    }
  }, []);

  /**
   * @function useEffect
   * @description
   * On page reload or `roadmapGenerationMode` changes it checks if tab specified in the url or not. If present then it validates it with `roadmapGenerationMode` and set the tab accordingly. If the roadmap is manually generated and tab is list then routes to main path because list tab is only for `ai-generated` roadmap.
   */
  useEffect(() => {
    // Check if the tab name is in url
    const activeTab = searchParams.get('tab');
    if (activeTab && ['tree', 'list'].includes(activeTab)) {
      // For manually created roadmap if tab is list then do not change layout and route to main
      if (activeTab === 'list' && roadmapGenerationMode === 'manual') {
        router.push(`${location}`, { replace: true });
        return;
      }
      setCurrentRoadmapView(activeTab);
    } else {
      router.push(`${location}`, { replace: true });
    }
  }, [roadmapGenerationMode]);

  useEffect(() => {
    if (selectedNode && roadmapContainerRef?.current) {
      roadmapContainerRef.current.style.overflow = 'hidden';
    }
  }, [selectedNode]);

  /**
   * Computes the sequential order of learning chapters (subtopics) in the roadmap.
   *
   * This hook traverses the roadmap nodes and edges to generate an array representing the
   * left-to-right, top-to-bottom ordered list of all subtopics and subtopic groups under their
   * respective topics/topicGroups. Used for navigation and chapter progression logic.
   *
   * The order is determined as follows:
   * - Topic and topicGroup nodes are collected and sorted top-to-bottom (by position.y).
   * - For each topic, connected subtopicGroup and subtopic nodes (children via outbound edges) are gathered
   *   and sorted left-to-right (by position.x).
   * - For each connected module:
   *   - If it is a subtopic node, include as an individual chapter.
   *   - If it is a subtopicGroup, gather all direct child subtopic nodes in left-to-right order.
   * - Result is a flattened array of all ordered subtopic nodes for learning progression.
   *
   * @type {import('react').DependencyList} Dependencies: [nodes, edges]
   * @returns {Array<Object>} Ordered array of subtopic node objects
   */
  const chapterLearningOrder = useMemo(() => {
    const sortByPosition = (nodeA, nodeB) =>
      nodeA.position.x - nodeB.position.x;
    const topicNodes = nodes
      .filter((n) => ['topic', 'topicGroup'].includes(n.type))
      .sort((a, b) => a.position.y - b.position.y);
    let allSubtopics = [];
    topicNodes.forEach((topic) => {
      const nodesConnectedToTopic = edges
        .filter((e) => e.source === topic.id)
        .map((e) => e.target);
      const modules = nodesConnectedToTopic
        .map((id) =>
          nodes.find(
            (n) =>
              n.id === id && ['subtopicGroup', 'subtopic'].includes(n.type),
          ),
        )
        .filter(Boolean)
        .sort(sortByPosition); // left-to-right order
      modules.forEach((module) => {
        const subtopics =
          module.type === 'subtopic'
            ? [module]
            : nodes
                .filter((n) => n?.parentId === module.id)
                .filter(Boolean)
                .sort(sortByPosition);
        allSubtopics.push(...subtopics);
      });
    });
    return allSubtopics;
  }, [nodes, edges]);

  // Framer Animation variants
  const backdropVariants = {
    hidden: {
      opacity: 0,
      transition: { duration: 0.5 },
    },
    visible: {
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  const modalVariants =
    width < 768
      ? {
          hidden: {
            y: '100%',
            opacity: 0,
            transition: {
              type: 'tween',
              duration: 0.5,
              ease: 'easeInOut',
            },
          },
          visible: {
            y: 0,
            opacity: 1,
            transition: {
              type: 'tween',
              duration: 0.5,
              ease: 'easeOut',
            },
          },
        }
      : {
          hidden: {
            x: '-100%',
            transition: {
              type: 'tween',
              duration: 0.5,
              ease: 'easeInOut',
            },
          },
          visible: {
            x: 0,
            transition: {
              type: 'tween',
              duration: 0.5,
              ease: 'easeOut',
            },
          },
        };

  return (
    <div className={styles['main-container']}>
      <div className={styles['main-container-inner']}>
        {/* <Header /> */}
        <div
          className={styles['container']}
          id="roadmap-screen-container"
          ref={roadmapContainerRef}
        >
          <div className={styles['container-inner']}>
            <RoadmapHeroSection
              roadmapId={roadmapId}
              mode={mode}
              onRefreshButtonClick={onRefreshButtonClick}
            />

            <RoadmapUtilityPanel
              currentRoadmapView={currentRoadmapView}
              setCurrentRoadmapView={setCurrentRoadmapView}
            />

            {currentRoadmapView === 'list' &&
            roadmapGenerationMode === 'ai-generated' ? (
              <RoadmapModuleView
                roadmapId={roadmapId}
                nodes={nodes}
                edges={edges}
                learningProgress={learningProgress}
                setLearningProgress={setLearningProgress}
                nodeData={nodeData}
                setNodeData={setNodeData}
              />
            ) : (
              <RoadmapDiagramRenderer
                nodes={nodes}
                edges={edges}
                learningProgress={learningProgress}
                onNodeClick={handleNodeClick}
                courseRecommendations={
                  courseRecommendations?.recommended_courses || []
                }
              />
            )}
            {mode === 'live' && !isRoadmapFetching && (
              <CourseRecommendation roadmapId={roadmapId} />
            )}
            <AnimatePresence>
              {isDoubtSolverSectionOpen && isMobile && mode === 'live' && (
                <DoubtSolver roadmapId={roadmapId} />
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {selectedNode && (
              <>
                <motion.div
                  className={styles['backdrop']}
                  onClick={closePopup}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={backdropVariants}
                  key="backdrop"
                  // style={{top: modalScrollOffset}}
                >
                  <motion.div
                    className={styles['modal']}
                    // initial="hidden"
                    // animate="visible"
                    exit="hidden"
                    variants={modalVariants}
                    onClick={(e) => e.stopPropagation()}
                    key="modal"
                  >
                    <NodeContentViewer
                      roadmapId={roadmapId}
                      selectedNode={selectedNode}
                      learningProgress={learningProgress}
                      setLearningProgress={setLearningProgress}
                      closePopup={closePopup}
                      premiumAccessData={premiumAccessData}
                      roadmapTitle={roadmapTitle}
                      roadmapPrice={roadmapPrice}
                      roadmapAccessLevel={roadmapAccessLevel}
                      roadmapGenerationMode={roadmapGenerationMode}
                      chapterLearningOrder={chapterLearningOrder}
                    />
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {!isDoubtSolverSectionOpen && mode === 'live' && <FloatingBot />}
        </div>

        {/* <GetInTouchSection /> */}
        {/* <RelatedCoursesSection /> */}
        {/* <Footer /> */}
      </div>
      <AnimatePresence>
        {isDoubtSolverSectionOpen && !isMobile && mode === 'live' && (
          <DoubtSolver roadmapId={roadmapId} />
        )}
      </AnimatePresence>
    </div>
  );
};

export const RoadmapHeroSection = ({
  roadmapId,
  mode,
  onRefreshButtonClick,
}) => {
  // User details from authStore
  const userDetails = useAuthStore((s) => s.userDetails);

  // Client roadmap details from artifactStore
  const nodes = useRoadmapStore((s) => s.nodes);
  const edges = useRoadmapStore((s) => s.edges);
  const roadmapTitle = useRoadmapStore((s) => s.roadmapTitle);
  const isBookmarked = useRoadmapStore((s) => s.isBookmarked);
  const setIsBookmarked = useRoadmapStore((s) => s.setIsBookmarked);
  const roadmapPrice = useRoadmapStore((s) => s.roadmapPrice);
  const premiumAccessData = useRoadmapStore((s) => s.premiumAccessData);
  const totalRoadmapContent = useRoadmapStore((s) => s.totalRoadmapContent);
  const grossRoadmapContent = useRoadmapStore((s) => s.grossRoadmapContent);
  const contentCompleted = useRoadmapStore((s) => s.contentCompleted);
  const isRoadmapFetching = useRoadmapStore((s) => s.isRoadmapFetching);
  const isAiContentGenerationJobRunning = useRoadmapStore(
    (s) => s.isAiContentGenerationJobRunning,
  );
  const setIsAiContentGenerationJobRunning = useRoadmapStore(
    (s) => s.setIsAiContentGenerationJobRunning,
  );
  const aiContentGenerationStatus = useRoadmapStore(
    (s) => s.aiContentGenerationStatus,
  );
  const setAiContentGenerationStatus = useRoadmapStore(
    (s) => s.setAiContentGenerationStatus,
  );
  const roadmapGenerationMode = useRoadmapStore((s) => s.roadmapGenerationMode);
  const aiContentGenerationJobDetails = useRoadmapStore(
    (s) => s.aiContentGenerationJobDetails,
  );
  const setAiContentGenerationJobDetails = useRoadmapStore(
    (s) => s.setAiContentGenerationJobDetails,
  );
  const roadmapAccessLevel = useRoadmapStore((s) => s.roadmapAccessLevel);
  const roadmapGenerationPrompt = useRoadmapStore(
    (s) => s.roadmapGenerationPrompt,
  );

  const {
    showNotification,
    showLoadingNotification,
    resolveNotification,
    rejectNotification,
  } = useNotification();

  const { isMobile } = useWindowDimensions();

  // State to store the percentage of user learning progress
  const [progressPercentage, setprogressPercentage] = useState(0);
  // State to check the roamdap is bookmarked or not
  const [isBoomarkingRoadmap, setIsBoomarkingRoadmap] = useState(false);
  // State to check the roadmap is downloading or not
  const [isDownloadingRoadmap, setIsDownloadingRoadmap] = useState(false);
  // State to show and hide export modal
  const [showExportModal, setShowExportModal] = useState(false);

  const exportRoadmapRef = useRef(null);
  const downloadRoadmapRef = useRef(null);
  const router = useRouter();

  // useEffect(() => {
  //   if (location.state?.paymentSuccess) {
  //     showNotification(
  //       "success",
  //       "You have upgraded from free to premium access. All the premium conents are unlocked",
  //       { position: "top-center" },
  //     );
  //     setTimeout(() => {
  //       showNotification(
  //         "info",
  //         "Note : The topic/sub-topic you have marked as done earlier, the premium content in these also included in progress",
  //         { position: "top-center" },
  //       );
  //     }, 3000);

  //     // Clean up state so it doesn't show again on refresh
  //     window.history.replaceState({}, document.title);
  //   }
  // }, [location.state]);

  // Navigate to home path `/` when back button clicked
  const handleBackButtonClick = () => {
    router.push('/dashboard');
  };

  const getAllowedExportTypes = () => {
    let data = ['png', 'pdf'];
    if (roadmapGenerationMode === 'ai-generated') {
      data.push('csv');
    }

    return data;
  };

  const downloadRoadmap = async (format) => {
    setIsDownloadingRoadmap(true);
    const toastId = uuid4();
    showLoadingNotification(toastId, 'Downloading roadmap. Please wait');

    try {
      // Get the original roadmap element
      const roadmapElement = document.getElementById('react-flow-wrapper');
      const knowledgeLegendElement = document.getElementById(
        'knowledge-level-legend',
      );

      // Create a hidden container for rendering
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.position = 'fixed';
      hiddenContainer.style.top = '0';
      hiddenContainer.style.left = '0';
      hiddenContainer.style.zIndex = '-9999'; // Hide it off-screen instead of visible with high z-index
      hiddenContainer.style.display = 'flex';
      hiddenContainer.style.flexDirection = 'column';
      hiddenContainer.style.justifyContent = 'center';
      hiddenContainer.style.gap = '10px';

      document.body.appendChild(hiddenContainer);

      // Clone the roadmap element
      const clone = roadmapElement.cloneNode(true);
      const knowledgeLevelLegendClone = knowledgeLegendElement.cloneNode(true);

      // Get the actual svg element inside the clone
      const svgElement = clone.querySelector('svg');
      if (!svgElement) {
        console.error('SVG element not found in the roadmap');
        return;
      }

      // Get the original dimensions and calculate aspect ratio
      const originalWidth =
        svgElement.viewBox.baseVal.width || svgElement.width.baseVal.value;
      const originalHeight =
        svgElement.viewBox.baseVal.height || svgElement.height.baseVal.value;
      const aspectRatio = originalHeight / originalWidth;

      // Set the fixed width and calculate proportional height
      const targetWidth = 1200;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      // Configure the container with the target dimensions
      hiddenContainer.style.width = `${targetWidth}px`;
      hiddenContainer.style.height = `${targetHeight + 200}px`;

      // Configure the clone for proper rendering
      clone.style.width = `${targetWidth}px`;
      clone.style.height = `${targetHeight}px`;
      clone.style.transform = 'scale(1)'; // Reset any scaling
      clone.style.display = 'block';
      clone.style.overflow = 'visible';
      clone.style.padding = '5px';

      // Remove unwanted elements
      const elementsToRemove = clone.querySelectorAll(
        '#knowledge-level-legend, #progress-status-div',
      );
      elementsToRemove.forEach((el) => el.remove());

      // Fix any label width issues
      const elementToUpdate = clone.querySelectorAll('#node-lable-ct');
      elementToUpdate.forEach((el) => (el.style.width = '100%'));

      knowledgeLevelLegendClone.style.width = '100%';
      knowledgeLevelLegendClone.style.margin = '20px';
      knowledgeLevelLegendClone.style.justifyContent = 'flex-start';
      const knlLeft = knowledgeLevelLegendClone.querySelectorAll('#knl_left');
      const knlRight = knowledgeLevelLegendClone.querySelectorAll('#knl_right');
      knlLeft.forEach(
        (kl) => ((kl.style.height = '16px'), (kl.style.width = '16px')),
      );
      knlRight.forEach((kr) => (kr.style.fontSize = '16px'));

      // Watermark Text
      // addWatermark(clone, 'SETU ROADMAPS');

      // Add the clone to the hidden container
      hiddenContainer.appendChild(knowledgeLevelLegendClone);
      hiddenContainer.appendChild(clone);

      // Force layout calculation (in a way that won't trigger ESLint)
      const _ = hiddenContainer.getBoundingClientRect(); // This forces a layout recalculation

      // Copyright Text at Bottom
      addCopyright(hiddenContainer);

      // Convert to image with the exact dimensions
      const canvas = await html2canvas(hiddenContainer, {
        allowTaint: true,
        backgroundColor: '#fff',
        useCORS: true,
        foreignObjectRendering: true,
        width: targetWidth,
        height: targetHeight + 200,
        scale: 2,
      });

      // Remove the hidden container after rendering
      document.body.removeChild(hiddenContainer);

      if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
          compress: true,
        });

        pdf.addImage(imgData, 'JEPG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${roadmapTitle}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = canvas.toDataURL(`image/${format}`);
        link.download = `${roadmapTitle}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      resolveNotification(toastId, 'Downloaded successfully');
    } catch (error) {
      console.error('Error in html2canvas:', error);
      rejectNotification(toastId, 'Something went wrong. Please try again');
    } finally {
      setIsDownloadingRoadmap(false);
    }
  };

  /**
   * Escapes a value for inclusion in a CSV cell following RFC 4180.
   *
   * If the value is null/undefined an empty string is returned. If the
   * string contains a comma, double-quote or newline it is wrapped in
   * double quotes and any existing double quotes are escaped by doubling
   * them ("" -> """"). This conforms to RFC 4180 CSV quoting rules.
   *
   * @function escapeCSV
   * @param {*} value - The value to be escaped (any type; will be converted to string).
   * @returns {string} The CSV-safe string (possibly wrapped in quotes).
   * @see {@link https://datatracker.ietf.org/doc/html/rfc4180 RFC 4180}
   */
  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    // Wrap in quotes if it contains comma, quote, or newline
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`; // double quotes inside quotes
    }
    return str;
  };

  /**
   * Exports the current roadmap to a CSV file following RFC 4180 conventions.
   *
   * @function exportRoadmapToCSV
   * @description
   * Builds a CSV containing Topic, Module and Chapters columns from the current roadmap graph.
   * - Collects all topic/topicGroup nodes.
   * - For each topic, finds connected module nodes (subtopicGroup, subtopic, assignmentNode).
   * - For each module, collects its child nodes (by parentId) as chapters.
   * - Produces one CSV row per chapter; if a module has no children a row with an empty chapter cell is produced.
   * - Each CSV cell is escaped using the local `escapeCSV` helper (RFC 4180 compliant quoting).
   * - Prepends a UTF-8 BOM for Excel compatibility and triggers a download with a filename containing the roadmap title and current date.
   *
   * The function catches and logs any errors encountered during CSV generation.
   *
   * @returns {void}
   */
  const exportRoadmapToCSV = () => {
    try {
      const topicNodes = nodes.filter((n) =>
        ['topic', 'topicGroup'].includes(n.type),
      );
      const roadmap = topicNodes.map((topicNode) => {
        const connectedMpduleEdges = edges.filter(
          (e) => e.source === topicNode.id,
        );

        const moduleNodes = connectedMpduleEdges
          .map((e) =>
            nodes.find(
              (n) =>
                n.id === e.target &&
                ['subtopicGroup', 'subtopic', 'assignmentNode'].includes(
                  n.type,
                ),
            ),
          )
          .filter(Boolean);

        const moduleWithChildren = moduleNodes.map((moduleNode) => {
          const childNodes = nodes.filter((n) => n.parentId === moduleNode.id);
          return {
            ...moduleNode,
            children: childNodes,
          };
        });

        return {
          ...topicNode,
          modules: moduleWithChildren,
        };
      });

      const csvRows = [];
      roadmap.forEach((topic) => {
        topic.modules.forEach((mod) => {
          if (mod.children.length > 0) {
            mod.children.forEach((child) => {
              csvRows.push({
                topic: topic.data?.label || topic.id,
                module: mod.data?.label || mod.id,
                child: child.data?.label || child.id,
              });
            });
          } else {
            csvRows.push({
              topic: topic.data?.label || topic.id,
              module: mod.data?.label || mod.id,
              child: '',
            });
          }
        });
      });

      // Convert to CSV string if needed
      const csvContent = [
        ['Topic', 'Module', 'Chapters'],
        ...csvRows.map((r) => [r.topic, r.module, r.child]),
      ]
        .map((row) => row.map(escapeCSV).join(',')) // escape each cell before joining
        .join('\n');

      // Optional: add UTF-8 BOM for Excel compatibility
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });

      // Create and click a download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${roadmapTitle}_${new Date()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditRoadmap = (roadmapId) => {
    if (!roadmapId) {
      return;
    }
    window.open(`/draw-roadmap/${roadmapId}`, '_blank', 'noopener,noreferrer');
  };

  /**
   * Calculates and updates the progress percentage based on the content completed in the roadmap.
   *
   * @function useEffect
   * @description
   * This effect is triggered whenever the `contentCompleted` or `totalRoadmapContent` values change. It calculates the
   * percentage of the roadmap content completed by dividing the `contentCompleted` by `totalRoadmapContent` and multiplying
   * by 100. The result is rounded and then set as the new `progressPercentage` state.
   *
   * If `totalRoadmapContent` is zero, the progress percentage will not be calculated to avoid division by zero errors.
   */
  useEffect(() => {
    if (totalRoadmapContent != 0) {
      const newProgressPercentage = Math.round(
        (contentCompleted * 100) / totalRoadmapContent,
      );
      setprogressPercentage(newProgressPercentage);
    }
  }, [contentCompleted, totalRoadmapContent]);

  /**
   * Detects clicks outside the download icon dropdown and closes it.
   * Runs when `showExportModal` changes.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        exportRoadmapRef.current &&
        !exportRoadmapRef.current.contains(event.target) &&
        downloadRoadmapRef.current &&
        !downloadRoadmapRef.current.contains(event.target)
      ) {
        setShowExportModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportModal]);

  useEffect(() => {
    console.log(
      (aiContentGenerationJobDetails?.mode === 'ai' ||
        isAiContentGenerationJobRunning ||
        !aiContentGenerationStatus) &&
        roadmapAccessLevel === 'owner',
    );
  }, []);

  return (
    <>
      {isRoadmapFetching && mode == 'live' ? (
        <>
          <RoadmapHeroSectionSkeletonLoader />
        </>
      ) : (
        <div className={styles['hero-container']}>
          {mode === 'preview' && (
            <div className={styles['hero-container-head']}>
              <div
                className={styles['back-section']}
                onClick={handleBackButtonClick}
              >
                <Image src={backIcon} alt="back-icon" />
                <span className={styles['back-section-text']}>
                  View Dashboard Page
                </span>
              </div>
              <div className={styles['utility-section']}>
                <button title="export roadmap" onClick={onRefreshButtonClick}>
                  <Image
                    src={refreshIcon}
                    alt="refresh"
                    title="refresh preview"
                  />
                </button>
                <button
                  title="export roadmap"
                  style={{ position: 'relative' }}
                  onClick={() => setShowExportModal(!showExportModal)}
                >
                  <Image
                    src={downloadIcon}
                    alt="download"
                    ref={downloadRoadmapRef}
                  />
                  <AnimatePresence>
                    {showExportModal && (
                      <ExportModal
                        allowedExportTypes={getAllowedExportTypes()}
                        modalRef={exportRoadmapRef}
                        onImageAndPDFExport={downloadRoadmap}
                        onCSVExport={exportRoadmapToCSV}
                      />
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          )}
          <div className={styles['hero-container-middle']}>
            <div className={styles['roadmap-title-ct']}>
              <div className={styles['roadmap-title']}>
                {roadmapTitle}
                {mode === 'live' &&
                  // #changes_05_10_2026: only owner and editor can edit the roadmap
                  ['owner', 'editor'].includes(roadmapAccessLevel) &&
                  !isMobile && (
                    <button
                      title="edit roadmap"
                      className={styles['edit-roadmap-btn']}
                      onClick={() => handleEditRoadmap(roadmapId)}
                    >
                      <Image
                        src={editIcon}
                        alt="edit-roadmap"
                        ref={downloadRoadmapRef}
                      />
                    </button>
                  )}
                {/* <PromptViewer prompt={roadmapGenerationPrompt} /> */}
              </div>
              {/* <div className={styles["title-right"]}>
                {premiumAccessData && (
                  <div className={styles["premium-access-chip"]}>
                    <p>Premium Access</p>
                  </div>
                )}
              </div> */}
            </div>
          </div>
          <div className={styles['hero-container-footer']}>
            {!premiumAccessData && (
              <>
                <div className={styles['hero-container-footer-head']}>
                  How to navigate your learning journey
                </div>
                <div className={styles['hero-container-footer-body']}>
                  <div
                    className={`${styles['hero-container-footer-content']} ${styles['fc-1']}`}
                  >
                    <span
                      className={
                        styles['hero-container-footer-content-heading']
                      }
                    >
                      Follow the Order:{' '}
                    </span>
                    <span>
                      The topics are structured in a logical order. It&apos;s
                      best to proceed sequentially, as each section builds upon
                      the knowledge gained in the previous one.
                    </span>
                  </div>
                  <div
                    className={`${styles['hero-container-footer-content']} ${styles['fc-2']}`}
                  >
                    <span
                      className={
                        styles['hero-container-footer-content-heading']
                      }
                    >
                      Explore Each Topic:{' '}
                    </span>
                    <span>
                      Each topic represents a specific area of knowledge or
                      skill. Dive into each one, using the provided resources
                      and examples to deepen your understanding.
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* <div className={styles['progress-container']}> */}
            <div className={styles['progress-ct-bar']}>
              <div className={styles['progress-ct-bar-top']}>
                <div>
                  <span className={styles['progress-percentage']}>
                    {progressPercentage}%
                  </span>{' '}
                  <span className={styles['progress-count']}>
                    {contentCompleted} Of {totalRoadmapContent} Done
                  </span>
                </div>
                <div className={styles['total-progress-count']}>
                  <p>
                    Total {totalRoadmapContent}{' '}
                    {!premiumAccessData ? `/ ${grossRoadmapContent}` : ''}{' '}
                    Content
                  </p>
                  {!premiumAccessData && (
                    <span className={styles['content-chip']}>Free</span>
                  )}
                </div>
              </div>
              <div className={styles['progress-bar-outer']}>
                <div
                  className={styles['progress-bar-inner']}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            {/* </div> */}
          </div>
          {mode === 'live' &&
            (aiContentGenerationJobDetails?.mode === 'ai' ||
              isAiContentGenerationJobRunning ||
              !aiContentGenerationStatus) &&
            roadmapAccessLevel === 'owner' &&
            roadmapGenerationMode === 'ai-generated' && (
              <ContentGenerationJobStatusViewer roadmapId={roadmapId} />
            )}
        </div>
      )}
    </>
  );
};

/**
 * Renders a utility panel for the roadmap screen, including the knowledge level legend and zoom controls.
 *
 * @component
 * @description
 * This component serves as a container for various utility tools related to the roadmap. It includes:
 * - A `KnowledgeLevelLegend` component that displays a legend for different knowledge levels.
 * - A `ZoomInZoomOutSection` component that allows users to zoom in and out on the roadmap view.
 *
 * @returns {JSX.Element} - The rendered utility panel containing zoom and knowledge level legend sections.
 */
const RoadmapUtilityPanel = ({ currentRoadmapView, setCurrentRoadmapView }) => {
  const isRoadmapFetching = useRoadmapStore((s) => s.isRoadmapFetching);
  const roadmapGenerationMode = useRoadmapStore((s) => s.roadmapGenerationMode);

  return (
    <div className={styles['utility-ct']}>
      {isRoadmapFetching ? (
        <Skeleton height={50} />
      ) : (
        <>
          <KnowledgeLevelLegend />
          <div className={styles['utility-ct-right']}>
            {roadmapGenerationMode === 'ai-generated' && (
              <RoadmapViewSwitcher
                currentRoadmapView={currentRoadmapView}
                setCurrentRoadmapView={setCurrentRoadmapView}
              />
            )}
            <ZoomInZoomOutSection />
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Provides zoom in and zoom out controls to adjust the zoom level of the roadmap.
 *
 * @component
 * @description
 * This component consists of two clickable icons: one for zooming in and one for zooming out. The zoom level is
 * controlled via the `zoomLevel` state in the `ClientRoadmapContext`. The zoom level can range from 1 to 3, with
 * each click modifying the zoom by 0.2.
 *
 * @returns {JSX.Element} - The rendered zoom controls with click events to zoom in and zoom out.
 */
const ZoomInZoomOutSection = () => {
  const MAX_ZOOM_LEVEL = 5;
  const MIN_ZOOM_LEVEL = 1;

  const zoomLevel = useRoadmapStore((s) => s.zoomLevel);
  const setZoomLevel = useRoadmapStore((s) => s.setZoomLevel);

  // Handles the zoom-in action, increasing the zoom level by 0.2, but not exceeding a maximum of 3.
  const handleZoomIn = () => {
    setZoomLevel(Math.min(MAX_ZOOM_LEVEL, zoomLevel + 0.2));
  };

  // Handles the zoom-out action, decreasing the zoom level by 0.2, but not going below a minimum of 1.
  const handleZoomOut = () => {
    setZoomLevel(Math.max(MIN_ZOOM_LEVEL, zoomLevel - 0.2));
  };

  return (
    <div className={styles['zizo-inner']}>
      <Image src={zoomInIcon} onClick={handleZoomIn} alt="zoom-in" />
      <Image src={zoomOutIcon} onClick={handleZoomOut} alt="zoom-out" />
    </div>
  );
};

const RoadmapDiagramRenderer = ({
  nodes,
  edges,
  learningProgress,
  onNodeClick,
  courseRecommendations,
}) => {
  const zoomLevel = useRoadmapStore((s) => s.zoomLevel);

  return (
    <div className={styles['react-flow']} id="react-flow-wrapper">
      {nodes.length > 0 && edges.length >= 0 && (
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
            source={'roadmap-page'}
            roadmap_graph={{ nodes, edges }}
            learningProgress={learningProgress}
            onNodeClick={onNodeClick}
            courseRecommendations={courseRecommendations}
            showLearningStatus={true}
          />
          {/* <KnowledgeLevelLegend /> */}
          <div style={{ position: 'absolute', top: '0', left: '0' }}>
            <EdgeMarkers />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Renders a legend displaying different knowledge levels for the roadmap content.
 *
 * @component
 * @description
 * This component displays a visual legend indicating the three knowledge levels associated with the roadmap content:
 * - **Must Know** (represented by a solid color)
 * - **Good to Know** (represented by a different color)
 * - **Suggested Learning** (represented by another color)
 * Each level is displayed with a label on the right and a color indicator on the left.
 *
 * @returns {JSX.Element} - The rendered knowledge level legend with visual indicators for each level.
 */
export const KnowledgeLevelLegend = () => {
  return (
    <div
      className={styles['knowledge-level-legend']}
      id="knowledge-level-legend"
    >
      <div className={styles['knowledge-level-child']}>
        <div
          className={`${styles['knl-left']} ${styles['must-know']}`}
          id="knl_left"
        ></div>
        <div className={styles['knl-right']} id="knl_right">
          Must Know
        </div>
      </div>
      <div className={styles['knowledge-level-child']}>
        <div
          className={`${styles['knl-left']} ${styles['good-to-know']}`}
          id="knl_left"
        ></div>
        <div className={styles['knl-right']} id="knl_right">
          Good to Know
        </div>
      </div>
      <div className={styles['knowledge-level-child']}>
        <div
          className={`${styles['knl-left']} ${styles['suggested-learning']}`}
          id="knl_left"
        ></div>
        <div className={styles['knl-right']} id="knl_right">
          Suggested Learning
        </div>
      </div>
    </div>
  );
};

/**
 *
 * Modal to export roadmap in various format
 * Supported formats are `png`, `pdf` and `csv`
 * @returns {JSX.Element}
 */
const ExportModal = ({
  allowedExportTypes,
  modalRef,
  onImageAndPDFExport,
  onCSVExport,
}) => {
  const getExportOptionIcon = (optionId) => {
    switch (optionId) {
      case 'png':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 16 16"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M14 4.5V14a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-3.76 8.132q.114.23.14.492h-.776a.8.8 0 0 0-.097-.249a.7.7 0 0 0-.17-.19a.7.7 0 0 0-.237-.126a1 1 0 0 0-.299-.044q-.427 0-.665.302q-.234.301-.234.85v.498q0 .351.097.615a.9.9 0 0 0 .304.413a.87.87 0 0 0 .519.146a1 1 0 0 0 .457-.096a.67.67 0 0 0 .272-.264q.09-.164.091-.363v-.255H8.82v-.59h1.576v.798q0 .29-.097.55a1.3 1.3 0 0 1-.293.458a1.4 1.4 0 0 1-.495.313q-.296.111-.697.111a2 2 0 0 1-.753-.132a1.45 1.45 0 0 1-.533-.377a1.6 1.6 0 0 1-.32-.58a2.5 2.5 0 0 1-.105-.745v-.506q0-.543.2-.95q.201-.406.582-.633q.384-.228.926-.228q.357 0 .636.1q.281.1.48.275q.2.176.314.407Zm-8.64-.706H0v4h.791v-1.343h.803q.43 0 .732-.172q.305-.177.463-.475a1.4 1.4 0 0 0 .161-.677q0-.374-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.381a.57.57 0 0 1-.238.24a.8.8 0 0 1-.375.082H.788v-1.406h.66q.327 0 .512.182q.185.181.185.521m1.964 2.666V13.25h.032l1.761 2.675h.656v-3.999h-.75v2.66h-.032l-1.752-2.66h-.662v4z"
            />
          </svg>
        );

      case 'pdf':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 16 16"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM1.6 11.85H0v3.999h.791v-1.342h.803q.43 0 .732-.173q.305-.175.463-.474a1.4 1.4 0 0 0 .161-.677q0-.375-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.38a.57.57 0 0 1-.238.241a.8.8 0 0 1-.375.082H.788V12.48h.66q.327 0 .512.181q.185.183.185.522m1.217-1.333v3.999h1.46q.602 0 .998-.237a1.45 1.45 0 0 0 .595-.689q.196-.45.196-1.084q0-.63-.196-1.075a1.43 1.43 0 0 0-.589-.68q-.396-.234-1.005-.234zm.791.645h.563q.371 0 .609.152a.9.9 0 0 1 .354.454q.118.302.118.753a2.3 2.3 0 0 1-.068.592a1.1 1.1 0 0 1-.196.422a.8.8 0 0 1-.334.252a1.3 1.3 0 0 1-.483.082h-.563zm3.743 1.763v1.591h-.79V11.85h2.548v.653H7.896v1.117h1.606v.638z"
            />
          </svg>
        );
      case 'csv':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 16 16"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM3.517 14.841a1.13 1.13 0 0 0 .401.823q.195.162.478.252q.284.091.665.091q.507 0 .859-.158q.354-.158.539-.44q.187-.284.187-.656q0-.336-.134-.56a1 1 0 0 0-.375-.357a2 2 0 0 0-.566-.21l-.621-.144a1 1 0 0 1-.404-.176a.37.37 0 0 1-.144-.299q0-.234.185-.384q.188-.152.512-.152q.214 0 .37.068a.6.6 0 0 1 .246.181a.56.56 0 0 1 .12.258h.75a1.1 1.1 0 0 0-.2-.566a1.2 1.2 0 0 0-.5-.41a1.8 1.8 0 0 0-.78-.152q-.439 0-.776.15q-.337.149-.527.421q-.19.273-.19.639q0 .302.122.524q.124.223.352.367q.228.143.539.213l.618.144q.31.073.463.193a.39.39 0 0 1 .152.326a.5.5 0 0 1-.085.29a.56.56 0 0 1-.255.193q-.167.07-.413.07q-.175 0-.32-.04a.8.8 0 0 1-.248-.115a.58.58 0 0 1-.255-.384zM.806 13.693q0-.373.102-.633a.87.87 0 0 1 .302-.399a.8.8 0 0 1 .475-.137q.225 0 .398.097a.7.7 0 0 1 .272.26a.85.85 0 0 1 .12.381h.765v-.072a1.33 1.33 0 0 0-.466-.964a1.4 1.4 0 0 0-.489-.272a1.8 1.8 0 0 0-.606-.097q-.534 0-.911.223q-.375.222-.572.632q-.195.41-.196.979v.498q0 .568.193.976q.197.407.572.626q.375.217.914.217q.439 0 .785-.164t.55-.454a1.27 1.27 0 0 0 .226-.674v-.076h-.764a.8.8 0 0 1-.118.363a.7.7 0 0 1-.272.25a.9.9 0 0 1-.401.087a.85.85 0 0 1-.478-.132a.83.83 0 0 1-.299-.392a1.7 1.7 0 0 1-.102-.627zm8.239 2.238h-.953l-1.338-3.999h.917l.896 3.138h.038l.888-3.138h.879z"
            />
          </svg>
        );
      default:
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="Frame">
              <path
                id="Vector"
                d="M3 16.5V18.75C3 19.3467 3.23705 19.919 3.65901 20.341C4.08097 20.7629 4.65326 21 5.25 21H18.75C19.3467 21 19.919 20.7629 20.341 20.341C20.7629 19.919 21 19.3467 21 18.75V16.5M16.5 12L12 16.5M12 16.5L7.5 12M12 16.5V3"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        );
    }
  };

  const exportOptions = [
    {
      id: 'png',
      name: 'PNG',
    },
    {
      id: 'pdf',
      name: 'PDF',
    },
    {
      id: 'csv',
      name: 'CSV',
    },
  ].filter((op) => allowedExportTypes.includes(op.id));

  const onExportClick = (optionId) => {
    try {
      if (optionId === 'png') {
        onImageAndPDFExport('png');
      } else if (optionId === 'pdf') {
        onImageAndPDFExport('pdf');
      }
      if (optionId === 'csv') {
        onCSVExport();
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <motion.div
      ref={modalRef}
      className={styles['exp-modal']}
      initial={{ opacity: 0, y: 0, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {exportOptions.map((eop, idx) => (
        <div
          className={styles['exp-item']}
          key={idx}
          onClick={() => onExportClick(eop.id)}
          title={`export ${eop.name.toLowerCase()}`}
        >
          {getExportOptionIcon(eop.id)}
          <span>{eop.name}</span>
        </div>
      ))}
    </motion.div>
  );
};

/**
 *
 * Component to show the roadmap creation prompt
 * @returns {JSX.Element}
 */
const PromptViewer = ({ prompt }) => {
  const [hovered, setHovered] = useState(false);

  return (
    prompt && (
      <div
        className={styles['pv-ct']}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setHovered(!hovered)}
      >
        {/* <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          // class="lucide lucide-square-terminal-icon lucide-square-terminal"
        >
          <path d="m7 11 2-2-2-2" />
          <path d="M11 13h4" />
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        </svg> */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 7H9V5H11M11 15H9V9H11M10 0C8.68678 0 7.38642 0.258658 6.17317 0.761205C4.95991 1.26375 3.85752 2.00035 2.92893 2.92893C1.05357 4.8043 0 7.34784 0 10C0 12.6522 1.05357 15.1957 2.92893 17.0711C3.85752 17.9997 4.95991 18.7362 6.17317 19.2388C7.38642 19.7413 8.68678 20 10 20C12.6522 20 15.1957 18.9464 17.0711 17.0711C18.9464 15.1957 20 12.6522 20 10C20 8.68678 19.7413 7.38642 19.2388 6.17317C18.7362 4.95991 17.9997 3.85752 17.0711 2.92893C16.1425 2.00035 15.0401 1.26375 13.8268 0.761205C12.6136 0.258658 11.3132 0 10 0Z"
            fill="black"
          />
        </svg>
        <motion.div
          className={styles['pv-prompt-text-ct']}
          initial={{ scale: 0, opacity: 0, originX: 1, originY: 0 }}
          animate={
            hovered
              ? { scale: 1, opacity: 1, originX: 1, originY: 0 }
              : { scale: 0, opacity: 0, originX: 1, originY: 0 }
          }
          transition={{
            duration: 0.4,
            ease: [0.25, 0.8, 0.25, 1],
          }}
        >
          <span>{prompt}</span>
        </motion.div>
      </div>
    )
  );
};

const RoadmapViewSwitcher = ({ currentRoadmapView, setCurrentRoadmapView }) => {
  const handleChangeView = (targetView) => {
    setCurrentRoadmapView(targetView);
    // const baseURL = location;
    // const newParams = new URLSearchParams(searchParams);
    // newParams.set('tab', targetView);
    // router.push(`${baseURL}?${newParams.toString()}`, { replace: true });
  };

  return (
    <div className={styles['rvs-main']}>
      <div
        className={`${styles['rvs-inner']} ${currentRoadmapView === 'tree' ? styles['active-pill'] : ''}`}
        onClick={() => handleChangeView('tree')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <rect width="8" height="8" x="3" y="3" rx="2" />
            <path d="M7 11v4a2 2 0 0 0 2 2h4" />
            <rect width="8" height="8" x="13" y="13" rx="2" />
          </g>
        </svg>
      </div>

      <div
        className={`${styles['rvs-inner']} ${currentRoadmapView === 'list' ? styles['active-pill'] : ''}`}
        onClick={() => handleChangeView('list')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3.75 6.75H20.25M3.75 12H20.25M3.75 17.25H12"
            stroke="black"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Roadmap Hero Section
 * @returns {JSX.Element}
 */
const RoadmapHeroSectionSkeletonLoader = () => {
  const { width } = useWindowDimensions();
  return (
    <div className={styles['hero-container']}>
      <div className={styles['hero-container-head']}>
        <Skeleton variant="text" height={40} width={width <= 768 ? 40 : 215} />
        <Skeleton variant="text" height={40} width={116} />
      </div>
      <div className={styles['hero-container-middle']}>
        <Skeleton variant="text" height={44} width={'75%'} />
        {/* <Skeleton variant="button" height={44} width={218} /> */}
      </div>
      <Skeleton variant="card" height={100} width={'100%'} />
    </div>
  );
};

export default RoadmapDataViewer;
