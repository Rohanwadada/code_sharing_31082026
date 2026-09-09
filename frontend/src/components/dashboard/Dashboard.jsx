'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import styles from './Dashboard.module.css';
import CustomizationModal from '../modals/CustomizationModal';
import NewRoadmapModal from '../modals/NewRoadmapModal';
import { AnimatePresence, motion } from 'framer-motion';
import { ADMIN_ROLE } from '@/utils/constants';
import { useConfirm } from '@/context/ConfirmationContext';
import { v4 as uuidv4 } from 'uuid';
import { useNotification } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';
import RoadmapAccessSharing from '../roadmap-editor/RoadmapAccessSharing';
import Button from '../ui/Button';
import RoadmapSearch from './RoadmapSearch';
import RoadmapTabs from './RoadmapTabs';
import RoadmapGrid from './RoadmapGrid';
import AssessmentGrid from './AssessmentGrid';
import Skeleton from '../utility/Skeleton';
import { deleteRoadmap, getAllRoadmap } from '@/service/roadmap.service';
import { getAllUserAssessment } from '@/service/assessmentAttempt.service';

// Show proper tags based on roadmap
// Format date of the roadmap

const TABS = [
  {
    id: 'all',
    name: 'All',
    count: 0,
    allowedRoles: ['admin', 'learner'],
  },
  {
    id: 'self_assigned',
    name: 'Self Assigned',
    count: 0,
    allowedRoles: ['admin', 'learner'],
  },
  {
    id: 'assigned_to_me',
    name: 'Assigned To Me',
    count: 0,
    allowedRoles: ['admin', 'learner'],
  },
  {
    id: 'assigned_to_others',
    name: 'Assigned To Team',
    count: 0,
    allowedRoles: ['admin'],
  },
  {
    id: 'draft',
    name: 'Draft',
    count: 0,
    allowedRoles: ['admin', 'learner'],
  },
  {
    id: 'assessment',
    name: 'Assessment',
    count: 0,
    allowedRoles: ['admin', 'learner'],
  },
];

const TAB_FILTERS = {
  all: () => true,

  self_assigned: (r) => r.access === 'owner',

  assigned_to_me: (r) => r.access === 'viewer',

  assigned_to_others: (r) => r.shared,

  draft: (r) =>
    r.mode !== 'ai-generated' &&
    ['owner', 'editor'].includes(r.access) &&
    r.status === 'draft',

  assessment: () => null
};

/**
 * Dashboard Component
 *
 * @description
 * This is the main dashboard component for roadmap management. It displays all roadmaps associated with the current user, including those created by the user, shared with them, and public ones. The component offers sectioned lists for "Draft", "Published", and "Assigned" roadmaps with filtering/search and CRUD operations for each section (as permitted by user role). It also provides:
 *  - A global roadmap search across all roadmaps.
 *  - Controls for creating a new roadmap (admin only).
 *  - Access management modal (admin only).
 *  - Responsive, animated UI with live updates on roadmap changes and modal management for clone and access dialogs.
 *
 * Major features:
 *   - Fetches, filters, and groups roadmaps by type/ownership.
 *   - Handles navigation to view/edit/create roadmaps.
 *   - Manages search and deletion of roadmaps with confirmation and notifications.
 *   - Renders key UI components such as Header, Footer, sectioned RoadmapSections, and loader states.
 *   - Uses AnimatePresence for animated modals and transitions.
 *
 * @returns {JSX.Element} The rendered dashboard landing page for roadmaps.
 */
const Dashboard = () => {
  const isLoading = useAuthStore((s) => s.isLoading);
  const userDetails = useAuthStore((s) => s.userDetails);

  const [roadmaps, setRoadmaps] = useState([]);
  // State to track if roadmaps are being fetched
  const [roadmapFetching, setRoadmapFetching] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [activeButton, setActiveButton] = useState('Dashboard');
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [showNewRoadmapModal, setShowNewRoadmapModal] = useState(false);
  const [userAssessments, setUserAssessments] = useState([]);

  const [tabs, setTabs] = useState(TABS);
  const [currentTab, setCurrentTab] = useState(tabs[0].id);

  // Global filtered roadmaps state
  const [globalFilteredRoadmaps, setGlobalFilteredRoadmaps] =
    useState(roadmaps);
  const router = useRouter();
  const confirm = useConfirm();
  const { showLoadingNotification, resolveNotification, rejectNotification } =
    useNotification();

  /**
   * Fetches all roadmaps associated with the user.
   * This function is called after user details are successfully fetched.
   */
  const fetchAllRoadmapOfUser = async () => {
    try {
      setRoadmapFetching(true);
      const response = await getAllRoadmap();

      setRoadmaps(sortRoadmapCards(response));
    } catch (error) {
    } finally {
      setRoadmapFetching(false);
    }
  };
  
  const fetchAllUserAssessments = async () => {
    try {
      setRoadmapFetching(true);
      const response = await getAllUserAssessment();

      setUserAssessments(response)

      // setRoadmaps(sortRoadmapCards(response));
    } catch (error) {
    } finally {
      setRoadmapFetching(false);
    }
  };

  const sortRoadmapCards = (roadmaps) => {
    return [...roadmaps].sort((a, b) => {
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  };

  const updateCurrentTabs = (roadmaps) => {
    const allowedTabs = TABS.filter((tab) =>
      tab.allowedRoles.includes(userDetails?.role),
    );
    return allowedTabs.map((tab) => ({
      ...tab,
      count:
        tab.id === 'assessment'
          ? userAssessments.length
          : roadmaps.filter(TAB_FILTERS[tab.id]).length,
    }));
  };

  const handleRoadmapEditClick = (event, roadmap) => {
    event.stopPropagation();
    event.preventDefault();
    router.push(`/draw-roadmap/${roadmap?.id}`);
  };

  const handleRoadmapCloneClick = (event, roadmap) => {
    event.stopPropagation();
    event.preventDefault();
    setSelectedRoadmap(roadmap);
  };

  const handleRoadmapDeleteClick = async (event, roadmap) => {
    event.stopPropagation();
    event.preventDefault();
    const confirmed = await confirm({
      type: 'delete-roadmap-confirmation',
      title: 'Are you sure you want to delete this roadmap ?',
      additionalProps: {
        cancelMessage: 'Cancel',
        yesMessage: 'Delete',
      },
    });
    if (confirmed) {
      const toastId = uuidv4();
      showLoadingNotification(toastId, 'Deleting Roadmap. Please wait');
      try {
        const response = await deleteRoadmap(roadmap?.id);
        resolveNotification(toastId, 'Roadmap deleted successfully');
        setRoadmaps((prev) => prev.filter((r) => r.id !== roadmap.id));
      } catch (error) {
        console.log(error);
        rejectNotification(toastId, 'Something went wrong. Please try again!');
      }
    }
  };

  const formatText = (text) => {
    if (!text) return;
    if (text.length > 1) {
      return text[0].toUpperCase() + text.slice(1);
    }
  };

  const filteredRoadmaps = useMemo(
    () => globalFilteredRoadmaps.filter(TAB_FILTERS[currentTab]),
    [currentTab, globalFilteredRoadmaps],
  );

  const handleTabChange = (tab) => {
    setCurrentTab(tab.id);
  };

  const onCancleManageAccess = () => {
    setShowManageAccessModal(false);
  };

  const handleGlobalFilterChange = useCallback((filtered) => {
    setGlobalFilteredRoadmaps(filtered);
  }, []);

  useLayoutEffect(() => {
    if (!isLoading && userDetails?.email) {
      fetchAllRoadmapOfUser();
      fetchAllUserAssessments()
    }
  }, [isLoading, userDetails]);

  useEffect(() => {
    const updatedTabs = updateCurrentTabs(globalFilteredRoadmaps);
    setTabs(updatedTabs);
  }, [globalFilteredRoadmaps, userAssessments]);

  return (
    <div className={styles['main-container']}>
      <div
        className={`${styles['main-container-inner']} ${showManageAccessModal ? styles['modal-open'] : ''}`}
      >
        <div className={styles['heading-div']}>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.4, ease: 'easeOut' },
            }}
            className={styles['heading']}
          >
            Welcome, {formatText(userDetails?.email?.split('@')[0])}!
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.4, ease: 'easeOut' },
            }}
            className={styles['sub-heading']}
          >
            Manage and track your roadmap creations seamlessly. Below, you'll
            find all the public roadmaps, roadmap created by you and shared with
            you. Stay organized and on track with roadmaps.
          </motion.div>
        </div>
        <div className={styles['roadmap-header']}>
          <div className={styles['roadmap-header-title']}>Your Dashboard</div>

          {roadmapFetching ? (
            <RoadmapHeaderSkeleton />
          ) : (
            <div className={styles['roadmap-header-bottom']}>
              <RoadmapSearch
                roadmaps={roadmaps}
                onFilteredChange={handleGlobalFilterChange}
                placeholder="Search all roadmaps. . ."
              />

              <div className={styles['roadmap-header-btn-ct']}>
                {/* <Button
                  variant="primary"
                  size="sm"
                  className={styles['roadmap-create-btn']}
                  leftIcon={<Plus width={20} height={20} />}
                  onClick={() => setShowNewRoadmapModal(true)}
                >
                  New Roadmap
                </Button>*/}
                {userDetails?.role && userDetails?.role === ADMIN_ROLE && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setShowManageAccessModal(!showManageAccessModal)
                    }
                  >
                    Manage Access
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {roadmapFetching ? (
          <RoadmapTabSkeleton />
        ) : (
          <RoadmapTabs
            tabs={tabs}
            currentTab={currentTab}
            onTabChnage={handleTabChange}
          />
        )}

        {roadmapFetching ? (
          <RoadmapGridSkeleton />
        ) : currentTab === 'assessment' ? (
          <AssessmentGrid assessments={userAssessments} />
        ) : (
          <RoadmapGrid
            roadmaps={filteredRoadmaps}
            onEditClick={handleRoadmapEditClick}
            onCloneClick={handleRoadmapCloneClick}
            onDeleteClick={handleRoadmapDeleteClick}
          />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showManageAccessModal && (
          <RoadmapAccessSharing onCancel={onCancleManageAccess} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRoadmap && (
          <CustomizationModal
            roadmap={selectedRoadmap}
            setSelectedRoadmap={setSelectedRoadmap}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewRoadmapModal && (
          <NewRoadmapModal onClose={() => setShowNewRoadmapModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const RoadmapHeaderSkeleton = () => {
  return (
    <div className={styles['roadmap-header-bottom']}>
      <Skeleton width={'25%'} height={'40px'} />
      <div className={styles['roadmap-header-btn-ct']}>
        <Skeleton width={'150px'} height={'40px'} />
        <Skeleton width={'150px'} height={'40px'} />
      </div>
    </div>
  );
};

const RoadmapTabSkeleton = () => {
  return (
    <div style={{ display: 'inline-flex', gap: '40px' }}>
      <Skeleton animationType="wave" count={5} width={120} height={40} />
    </div>
  );
};

const RoadmapGridSkeleton = () => {
  return (
    <div className={styles['sk-grid']}>
      <Skeleton animationType="wave" count={12} height={'185px'} />
    </div>
  );
};

const Plus = ({ size = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      {...props}
    >
      <path
        d="M10 3.75V16.25M16.25 10H3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Dashboard;
