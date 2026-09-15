'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import styles from './Sidebar.module.css';
import sidebarIcon from '@/assets/thread/sidebar-icon.svg';
import headerImage from '@/assets/shifu-logo.svg';
import { useThreadStore } from '@/store/threadStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useArtifactStore } from '@/store/artifactStore';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { ThreadType } from '@/utils/thread';
import { useSidebarStore } from '@/store/sidebarStore';
import Link from 'next/link';
import Skeleton from '../utility/Skeleton';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { getAllSavedRoadmapArtifact } from '@/service/artifact.service';
import { getAllUserThread } from '@/service/thread.service';
import { logout } from '@/service/auth.service';
import shifuIcon from '@/assets/bot/default.png';
import { ADMIN_ROLE } from '@/utils/constants';

const Sidebar = () => {
  const isSidebarOpen = useSidebarStore((s) => s.isSidebarOpen);
  const threads = useSidebarStore((s) => s.threads);
  const setThreads = useSidebarStore((s) => s.setThreads);
  const setIsSidebarOpen = useSidebarStore((s) => s.setIsSidebarOpen);
  const setSavedRoadmaps = useSidebarStore((s) => s.setSavedRoadmaps);
  const activeTab = useSidebarStore((s) => s.activeTab);
  const setActiveTab = useSidebarStore((s) => s.setActiveTab);

  const setArtifactData = useArtifactStore((s) => s.setArtifactData);
  const setIsArtifactOpen = useThreadStore((s) => s.setIsArtifactOpen);
  const setChatMinimized = useThreadStore((s) => s.setChatMinimized);
  const threadId = useThreadStore((s) => s.threadId);
  const setThreadId = useThreadStore((s) => s.setThreadId);
  const setMessages = useThreadStore((s) => s.setMessages);
  const savedRoadmaps = useSidebarStore((s) => s.savedRoadmaps);
  const isThreadsOpen = useSidebarStore((s) => s.isThreadsOpen);
  const setIsThreadsOpen = useSidebarStore((s) => s.setIsThreadsOpen);
  const isSavedOpen = useSidebarStore((s) => s.isSavedOpen);
  const setIsSavedOpen = useSidebarStore((s) => s.setIsSavedOpen);

  const threadReset = useThreadStore((s) => s.reset);

  const userDetails = useAuthStore((s) => s.userDetails);
  const setUserDetails = useAuthStore((s) => s.setUserDetails);
  const setIsLoggedIn = useAuthStore((s) => s.setIsLoggedIn);

  const artifactStoreReset = useArtifactStore((s) => s.reset);

  const { width: windowWidth, isMobile } = useWindowDimensions();

  const [isThreadsFetching, setIsThreadsFetching] = useState(false);
  const [isRoadmapsFetching, setIsRoadmapsFetching] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const router = useRouter();

  const handleLogoClick = () => {
    window.location.href = '/';
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleThreadsDropdown = () => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }
    setIsThreadsOpen(!isThreadsOpen);
  };
  const toggleSavedRoadmapsDropdown = () => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }
    setIsSavedOpen(!isSavedOpen);
  };

  const handleCreateNewRoadmap = () => {
    // window.location.href = "/shifu";
    setActiveTab('ask-shifu');

    threadReset();
    artifactStoreReset();
    router.push('/');
  };

  const handleGoToDashboard = () => {
    setActiveTab('dashboard');
    router.push('/dashboard');
    setTimeout(() => {
      // for safety reset the thread store
      threadReset();
    }, 500);
  };

  const handleGoToProject = () => {
    // if(userDetails?.role != ADMIN_ROLE) return;
    setActiveTab('project');
    router.push('/project');
    setTimeout(() => {
      // for safety reset the thread store
      threadReset();
    }, 500);
  };

  const handleGoToChat = (event, threadData) => {
    // Ignore clicks meant for new tab/window
    if (
      event.ctrlKey || // Windows/Linux
      event.metaKey || // Mac
      event.shiftKey ||
      event.button === 1 // middle click
    ) {
      return;
    }
    // Now block default navigation (only for normal clicks)
    event.preventDefault();

    const slug = threadData.slug;
    const projectId = threadData.project_id

    if (threadId === slug) {
      return;
    }

    setIsArtifactOpen(false);
    setArtifactData(null);
    setChatMinimized(false);
    setThreadId(slug);
    setMessages([]);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    router.push(`/project/${projectId}/shifu/${slug}`);
  };

  const handleGoToRoadmap = (event, roadmapData) => {
    // Ignore clicks meant for new tab/window
    if (
      event.ctrlKey || // Windows/Linux
      event.metaKey || // Mac
      event.shiftKey ||
      event.button === 1 // middle click
    ) {
      return;
    }
    // Now block default navigation (only for normal clicks)
    event.preventDefault();

    const slug = roadmapData.slug;
    const projectId = roadmapData.project_id;
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    router.push(`/project/${projectId}/roadmap/${slug}`);
    setTimeout(() => {
      // for safety reset the thread store
      threadReset();
    }, 1000);
  };

  const handleThreadViewAll = () => {
    router.push('/shifu/threads');
    // setIsSidebarOpen(false);
  };

  const handleSavedRoadmapViewAll = () => {
    router.push('/dashboard');
    // setIsSidebarOpen(false);

    setTimeout(() => {
      // for safety reset the thread store
      threadReset();
    }, 500);
  };

  /**
   * Logs out the user by sending a request to the backend and clearing session data.
   */
  const handleLogout = async () => {
    try {
      const responseData = await logout();
      localStorage.removeItem('uid');
      localStorage.removeItem('u_e');
      localStorage.removeItem('session_token');
      router.push('/');
      setUserDetails({});
      setIsLoggedIn(false);
    } catch (error) {
      localStorage.removeItem('u_e');
      localStorage.removeItem('session_token');
      router.push('/login');
      console.error(error);
    } finally {
      threadReset();
    }
  };

  const formatText = (text) => {
    if (text.length > 1) {
      return text[0].toUpperCase() + text.slice(1);
    }
  };

  useEffect(() => {
    const getAllThreads = async () => {
      try {
        setIsThreadsFetching(true);
        const responseData = await getAllUserThread(
          ThreadType.ROADMAP_GENERATION,
        );
        setThreads(responseData.threads);
      } catch (err) {
        console.error(err);
      } finally {
        setIsThreadsFetching(false);
      }
    };

    if (isThreadsOpen) {
      getAllThreads();
    }
  }, [isThreadsOpen]);

  useEffect(() => {
    const getAllSavedRoadmap = async () => {
      try {
        setIsRoadmapsFetching(true);
        const response = await getAllSavedRoadmapArtifact();

        console.log(response);

        setSavedRoadmaps(response.roadmaps);
      } catch (err) {
        console.error(err);
      } finally {
        setIsRoadmapsFetching(false);
      }
    };

    if (isSavedOpen) {
      getAllSavedRoadmap();
    }
  }, [isSavedOpen]);

  useEffect(() => {
    setActiveTab('dashboard')
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) setIsUserMenuOpen(false);
  }, [isSidebarOpen]);

  return (
    <>
      <div
        className={`${styles['mobile-overlay']} ${isSidebarOpen ? styles['active'] : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>
      <div
        className={`${styles['sidebar']} ${isSidebarOpen ? styles['open'] : ''}`}
      >
        <div className={styles['sidebar-top']}>
          <div className={styles['sidebar-item']}>
            <div className={styles['sidebar-item-head']}>
              <Image src={sidebarIcon} alt="sidebar" onClick={toggleSidebar} />
              <Image
                className={`${styles['header-image']} ${styles['desktop-only']} ${styles['label']}`}
                src={headerImage}
                alt="header-image"
                onClick={handleLogoClick}
                loading={'eager'}
              />
            </div>
          </div>

          <div className={styles['sidebar-section']}>
            <div className={`${styles['section-title']} ${styles['label']}`}>
              Main
            </div>

            <div className={styles['sidebar-items']}>
              {/* <div className={styles['sidebar-item']}>
                <div
                  className={`${styles['sidebar-item-head']}  ${activeTab === 'ask-shifu' ? styles['active-item'] : ''}`}
                  onClick={handleCreateNewRoadmap}
                >
                  <Image
                    src={shifuIcon}
                    height={24}
                    width={24}
                    style={{ borderRadius: '50%' }}
                    alt=""
                  />
                  <span className={`${styles['cr-txt']} ${styles['label']}`}>
                    Ask Shifu
                  </span>
                </div>
              </div>*/}

              {/* <div className={styles['sidebar-item']}>
                <div
                  className={`${styles['sidebar-item-head']}  ${activeTab === 'dashboard' ? styles['active-item'] : ''}`}
                  onClick={handleGoToDashboard}
                >
                  <Dashboard />
                  <span className={styles['label']}>Home</span>
                </div>
              </div>*/}

              <div className={styles['sidebar-item']}>
                <div
                  className={`${styles['sidebar-item-head']}  ${activeTab === 'dashboard' ? styles['active-item'] : ''}`}
                  onClick={handleGoToDashboard}
                >
                  <Book />
                  <span className={styles['label']}>My Learning</span>
                </div>
              </div>

              {/* <div className={styles['sidebar-item']}>
                <div
                  className={styles['sidebar-item-head']}
                  onClick={handleGoToDashboard}
                >
                  <Bell />
                  <span className={styles['label']}>Reminders</span>
                </div>
              </div>*/}

              <div className={styles['sidebar-item']}>
                <div
                  className={styles['sidebar-item-head']}
                  onClick={toggleThreadsDropdown}
                >
                  <Step />
                  <span className={styles['label']}>
                    <span className={styles['label-inner']}>
                      <span>Roadmap Chats</span>
                      <span
                        className={`${styles['arrow']} ${isThreadsOpen ? styles['arrowOpen'] : ''
                          }`}
                      >
                        <Arrow />
                      </span>
                    </span>
                  </span>
                </div>
                {isThreadsOpen && isSidebarOpen && (
                  <div className={styles['chat-list']}>
                    {isThreadsFetching ? (
                      <PlaceholderSkeleton />
                    ) : threads.length !== 0 ? (
                      <>
                        {threads.slice(0, 5).map((t, idx) => (
                          <Link
                            key={idx}
                            href={`/shifu/${t.slug}`}
                            className={styles['chat-title']}
                            onClick={(e) => handleGoToChat(e, t)}
                          >
                            {t.title}
                          </Link>
                        ))}
                        {threads.length > 5 && (
                          <div
                            className={styles['view-all']}
                            onClick={handleThreadViewAll}
                          >
                            View All
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={styles['empty-span']}>
                        No threads found
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles['sidebar-item']}>
                <div
                  className={styles['sidebar-item-head']}
                  onClick={toggleSavedRoadmapsDropdown}
                >
                  <Bookmark />

                  <span className={styles['label']}>
                    <span className={styles['label-inner']}>
                      <span>Saved Roadmaps</span>
                      <span
                        className={`${styles['arrow']} ${isSavedOpen ? styles['arrowOpen'] : ''
                          }`}
                      >
                        <Arrow />
                      </span>
                    </span>
                  </span>
                </div>

                {isSavedOpen && isSidebarOpen && (
                  <div className={styles['chat-list']}>
                    {isRoadmapsFetching ? (
                      <PlaceholderSkeleton />
                    ) : savedRoadmaps.length !== 0 ? (
                      <>
                        {savedRoadmaps.slice(0, 5).map((t, idx) => (
                          <Link
                            key={idx}
                            href={`/project/${t.project_id}/roadmap/${t.slug}`}
                            className={styles['chat-title']}
                            onClick={(e) => handleGoToRoadmap(e, t)}
                          >
                            {t.title}
                          </Link>
                        ))}
                        {savedRoadmaps.length > 0 && (
                          <div
                            className={styles['view-all']}
                            onClick={handleSavedRoadmapViewAll}
                          >
                            View All
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={styles['empty-span']}>
                        No saved roadmap
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles['sidebar-section']}>
            <div className={`${styles['section-title']} ${styles['label']}`}>
              My Projects
            </div>

            <div className={styles['sidebar-items']}>
              {/* <div className={styles['sidebar-item']}>
                <div
                  className={`${styles['sidebar-item-head']}`}
                  onClick={handleGoToDashboard}
                >
                  <Team />
                  <span className={styles['label']}>Team Overview</span>
                </div>
              </div>*/}

              <div className={styles['sidebar-item']}>
                <div
                  className={`${styles['sidebar-item-head']} ${activeTab === 'project' ? styles['active-item'] : ''}`}
                  onClick={handleGoToProject}
                >
                  <Project />
                  <span className={styles['label']}>Projects</span>
                </div>
              </div>

              {/* <div className={styles['sidebar-item']}>
                <div
                  className={styles['sidebar-item-head']}
                  onClick={handleGoToDashboard}
                >
                  <Help />
                  <span className={styles['label']}>Question Bank</span>
                </div>
              </div>*/}
            </div>
          </div>
        </div>

        <div className={styles['sidebar-bottom']} ref={userMenuRef}>
          <div className={styles['sidebar-item']}>
            <div
              className={styles['sidebar-item-head']}
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsUserMenuOpen((prev) => !prev);
                }
              }}
            >
              <span className={styles['user-avatar']}>
                <p>{userDetails?.email.split('@')[0].slice(0, 2)}</p>
              </span>
              <span className={`${styles['user-ct']} ${styles['label']}`}>
                <p className={styles['user-name']}>{userDetails?.email.split('@')[0] || 'Name'}</p>
                {/* <p className={styles['user-desig']}>Product Manager</p>*/}
              </span>
            </div>

            <AnimatePresence>
              {isUserMenuOpen && isSidebarOpen && (
                <motion.div
                  className={styles['user-dropdown']}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                >
                  <button
                    className={styles['user-dropdown-item']}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

const PlaceholderSkeleton = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Skeleton height={15} width={'100%'} />
      <Skeleton height={15} width={'80%'} />
    </div>
  );
};

const Step = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 22.5H3C2.60218 22.5 2.22064 22.342 1.93934 22.0607C1.65804 21.7794 1.5 21.3978 1.5 21V18C1.5 17.6022 1.65804 17.2206 1.93934 16.9393C2.22064 16.658 2.60218 16.5 3 16.5H9C9.39782 16.5 9.77936 16.658 10.0607 16.9393C10.342 17.2206 10.5 17.6022 10.5 18V21C10.5 21.3978 10.342 21.7794 10.0607 22.0607C9.77936 22.342 9.39782 22.5 9 22.5ZM3 18V21H9V18H3ZM21 15H9C8.60218 15 8.22064 14.842 7.93934 14.5607C7.65804 14.2794 7.5 13.8978 7.5 13.5V10.5C7.5 10.1022 7.65804 9.72064 7.93934 9.43934C8.22064 9.15804 8.60218 9 9 9H21C21.3978 9 21.7794 9.15804 22.0607 9.43934C22.342 9.72064 22.5 10.1022 22.5 10.5V13.5C22.5 13.8978 22.342 14.2794 22.0607 14.5607C21.7794 14.842 21.3978 15 21 15ZM9 10.5V13.5H21V10.5H9ZM12 7.5H3C2.60218 7.5 2.22064 7.34196 1.93934 7.06066C1.65804 6.77936 1.5 6.39782 1.5 6V3C1.5 2.60218 1.65804 2.22064 1.93934 1.93934C2.22064 1.65804 2.60218 1.5 3 1.5H12C12.3978 1.5 12.7794 1.65804 13.0607 1.93934C13.342 2.22064 13.5 2.60218 13.5 3V6C13.5 6.39782 13.342 6.77936 13.0607 7.06066C12.7794 7.34196 12.3978 7.5 12 7.5ZM3 3V6H12V3H3Z"
        fill="currentColor"
      />
    </svg>
  );
};
const Book = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 20.8921C13.6484 19.4135 15.7856 18.597 18 18.6001C19.0218 18.599 20.0364 18.7721 21 19.1121V4.86211C20.062 4.53011 19.052 4.35011 18 4.35011C15.7856 4.34695 13.6483 5.16338 12 6.64211C10.3516 5.16346 8.2144 4.34705 6 4.35011C4.948 4.35011 3.938 4.53011 3 4.86211V19.1121C3.96362 18.7721 4.97816 18.599 6 18.6001C8.305 18.6001 10.408 19.4671 12 20.8921ZM12 6.64211V20.8921"
        stroke="#929292"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Bell = () => {
  return (
    <svg
      width="19"
      height="20"
      viewBox="0 0 19 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.205 14.832C8.10301 15.0571 10.021 15.0571 11.919 14.832C13.7822 14.6114 15.6129 14.1717 17.373 13.522C15.8824 11.8708 15.0587 9.7245 15.062 7.5V6.75C15.062 5.1587 14.4299 3.63258 13.3046 2.50736C12.1794 1.38214 10.6533 0.75 9.062 0.75C7.4707 0.75 5.94458 1.38214 4.81936 2.50736C3.69414 3.63258 3.062 5.1587 3.062 6.75V7.5C3.06502 9.72463 2.24099 11.871 0.75 13.522C2.483 14.162 4.31 14.607 6.205 14.832ZM11.919 14.832C12.0631 15.2819 12.0989 15.7594 12.0236 16.2257C11.9482 16.692 11.7638 17.134 11.4854 17.5156C11.2069 17.8972 10.8423 18.2076 10.4212 18.4216C10.0001 18.6356 9.53438 18.7472 9.062 18.7472C8.58962 18.7472 8.12392 18.6356 7.70281 18.4216C7.28169 18.2076 6.91707 17.8972 6.63862 17.5156C6.36017 17.134 6.17576 16.692 6.10041 16.2257C6.02506 15.7594 6.0609 15.2819 6.205 14.832"
        stroke="#929292"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Dashboard = ({ width = 24, height = 24, ...props }) => {
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
        d="M3.75 6C3.75 5.40326 3.98705 4.83097 4.40901 4.40901C4.83097 3.98705 5.40326 3.75 6 3.75H8.25C8.84674 3.75 9.41903 3.98705 9.84099 4.40901C10.2629 4.83097 10.5 5.40326 10.5 6V8.25C10.5 8.84674 10.2629 9.41903 9.84099 9.84099C9.41903 10.2629 8.84674 10.5 8.25 10.5H6C5.40326 10.5 4.83097 10.2629 4.40901 9.84099C3.98705 9.41903 3.75 8.84674 3.75 8.25V6ZM3.75 15.75C3.75 15.1533 3.98705 14.581 4.40901 14.159C4.83097 13.7371 5.40326 13.5 6 13.5H8.25C8.84674 13.5 9.41903 13.7371 9.84099 14.159C10.2629 14.581 10.5 15.1533 10.5 15.75V18C10.5 18.5967 10.2629 19.169 9.84099 19.591C9.41903 20.0129 8.84674 20.25 8.25 20.25H6C5.40326 20.25 4.83097 20.0129 4.40901 19.591C3.98705 19.169 3.75 18.5967 3.75 18V15.75ZM13.5 6C13.5 5.40326 13.7371 4.83097 14.159 4.40901C14.581 3.98705 15.1533 3.75 15.75 3.75H18C18.5967 3.75 19.169 3.98705 19.591 4.40901C20.0129 4.83097 20.25 5.40326 20.25 6V8.25C20.25 8.84674 20.0129 9.41903 19.591 9.84099C19.169 10.2629 18.5967 10.5 18 10.5H15.75C15.1533 10.5 14.581 10.2629 14.159 9.84099C13.7371 9.41903 13.5 8.84674 13.5 8.25V6ZM13.5 15.75C13.5 15.1533 13.7371 14.581 14.159 14.159C14.581 13.7371 15.1533 13.5 15.75 13.5H18C18.5967 13.5 19.169 13.7371 19.591 14.159C20.0129 14.581 20.25 15.1533 20.25 15.75V18C20.25 18.5967 20.0129 19.169 19.591 19.591C19.169 20.0129 18.5967 20.25 18 20.25H15.75C15.1533 20.25 14.581 20.0129 14.159 19.591C13.7371 19.169 13.5 18.5967 13.5 18V15.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Bookmark = ({ width = 14, height = 17, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="17"
      viewBox="0 0 14 17"
      fill="none"
    >
      <path
        d="M11.66 1.02c.918.106 1.59.897 1.59 1.82v12.911L7 12.626.75 15.751V2.841c0-.924.672-1.715 1.59-1.821a40.4 40.4 0 0 1 9.32 0Z"
        stroke="currentColor"
      />
    </svg>
  );
};

const Arrow = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M6.875 3.75L13.125 10L6.875 16.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Team = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.9997 18.719L18.0007 18.75C18.0007 18.975 17.9887 19.197 17.9637 19.416C16.1491 20.4571 14.0928 21.0033 12.0007 21C9.83072 21 7.79372 20.424 6.03772 19.416C6.01201 19.1846 5.99965 18.9519 6.00072 18.719C6.00431 17.5857 6.33234 16.4769 6.94272 15.522C7.48472 14.6719 8.23235 13.9723 9.11645 13.4877C10.0005 13.0032 10.9926 12.7495 12.0007 12.75C13.009 12.7493 14.0013 13.003 14.8855 13.4875C15.7698 13.972 16.5176 14.6718 17.0597 15.522C17.6704 16.4768 17.9968 17.5866 18.0007 18.72C19.2675 18.8235 20.5419 18.6603 21.7417 18.241C21.7875 17.6764 21.6725 17.1104 21.4101 16.6084C21.1476 16.1064 20.7483 15.689 20.2585 15.4044C19.7687 15.1199 19.2084 14.9798 18.6423 15.0004C18.0762 15.0211 17.5275 15.2015 17.0597 15.521M6.00072 18.719C4.73435 18.8263 3.46063 18.6637 2.26172 18.242C2.21607 17.6776 2.33111 17.1117 2.59355 16.6099C2.85598 16.1081 3.25509 15.6908 3.74472 15.4063C4.23435 15.1218 4.79451 14.9817 5.36044 15.0021C5.92636 15.0226 6.47493 15.2028 6.94272 15.522M15.0007 6.75C15.0007 7.54565 14.6846 8.30871 14.122 8.87132C13.5594 9.43393 12.7964 9.75 12.0007 9.75C11.2051 9.75 10.442 9.43393 9.8794 8.87132C9.31679 8.30871 9.00072 7.54565 9.00072 6.75C9.00072 5.95435 9.31679 5.19129 9.8794 4.62868C10.442 4.06607 11.2051 3.75 12.0007 3.75C12.7964 3.75 13.5594 4.06607 14.122 4.62868C14.6846 5.19129 15.0007 5.95435 15.0007 6.75ZM21.0007 9.75C21.0007 10.0455 20.9425 10.3381 20.8294 10.611C20.7164 10.884 20.5506 11.1321 20.3417 11.341C20.1328 11.5499 19.8847 11.7157 19.6118 11.8287C19.3388 11.9418 19.0462 12 18.7507 12C18.4552 12 18.1627 11.9418 17.8897 11.8287C17.6167 11.7157 17.3687 11.5499 17.1597 11.341C16.9508 11.1321 16.7851 10.884 16.672 10.611C16.5589 10.3381 16.5007 10.0455 16.5007 9.75C16.5007 9.15326 16.7378 8.58097 17.1597 8.15901C17.5817 7.73705 18.154 7.5 18.7507 7.5C19.3475 7.5 19.9198 7.73705 20.3417 8.15901C20.7637 8.58097 21.0007 9.15326 21.0007 9.75ZM7.50072 9.75C7.50072 10.0455 7.44252 10.3381 7.32945 10.611C7.21637 10.884 7.05064 11.1321 6.84171 11.341C6.63278 11.5499 6.38474 11.7157 6.11176 11.8287C5.83877 11.9418 5.54619 12 5.25072 12C4.95524 12 4.66266 11.9418 4.38968 11.8287C4.1167 11.7157 3.86866 11.5499 3.65973 11.341C3.4508 11.1321 3.28506 10.884 3.17199 10.611C3.05892 10.3381 3.00072 10.0455 3.00072 9.75C3.00072 9.15326 3.23777 8.58097 3.65973 8.15901C4.08168 7.73705 4.65398 7.5 5.25072 7.5C5.84745 7.5 6.41975 7.73705 6.84171 8.15901C7.26366 8.58097 7.50072 9.15326 7.50072 9.75Z"
        stroke="#929292"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Project = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.0415 5C5.87574 5 5.71677 5.06585 5.59956 5.18306C5.48235 5.30027 5.4165 5.45924 5.4165 5.625V11.875C5.4165 12.0408 5.48235 12.1997 5.59956 12.3169C5.71677 12.4342 5.87574 12.5 6.0415 12.5C6.20726 12.5 6.36624 12.4342 6.48345 12.3169C6.60066 12.1997 6.6665 12.0408 6.6665 11.875V5.625C6.6665 5.45924 6.60066 5.30027 6.48345 5.18306C6.36624 5.06585 6.20726 5 6.0415 5ZM9.99984 5C9.83408 5 9.67511 5.06585 9.5579 5.18306C9.44069 5.30027 9.37484 5.45924 9.37484 5.625V9.375C9.37484 9.54076 9.44069 9.69973 9.5579 9.81694C9.67511 9.93415 9.83408 10 9.99984 10C10.1656 10 10.3246 9.93415 10.4418 9.81694C10.559 9.69973 10.6248 9.54076 10.6248 9.375V5.625C10.6248 5.45924 10.559 5.30027 10.4418 5.18306C10.3246 5.06585 10.1656 5 9.99984 5ZM13.3332 5.625C13.3332 5.45924 13.399 5.30027 13.5162 5.18306C13.6334 5.06585 13.7924 5 13.9582 5C14.1239 5 14.2829 5.06585 14.4001 5.18306C14.5173 5.30027 14.5832 5.45924 14.5832 5.625V13.5417C14.5832 13.7074 14.5173 13.8664 14.4001 13.9836C14.2829 14.1008 14.1239 14.1667 13.9582 14.1667C13.7924 14.1667 13.6334 14.1008 13.5162 13.9836C13.399 13.8664 13.3332 13.7074 13.3332 13.5417V5.625Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.12484 1.66675C2.73806 1.66675 2.36713 1.82039 2.09364 2.09388C1.82015 2.36737 1.6665 2.73831 1.6665 3.12508V16.8751C1.6665 17.6801 2.31984 18.3334 3.12484 18.3334H16.8748C17.2616 18.3334 17.6325 18.1798 17.906 17.9063C18.1795 17.6328 18.3332 17.2619 18.3332 16.8751V3.12508C18.3332 2.73831 18.1795 2.36737 17.906 2.09388C17.6325 1.82039 17.2616 1.66675 16.8748 1.66675H3.12484ZM2.9165 3.12508C2.9165 3.06983 2.93845 3.01684 2.97752 2.97777C3.01659 2.9387 3.06958 2.91675 3.12484 2.91675H16.8748C16.9301 2.91675 16.9831 2.9387 17.0221 2.97777C17.0612 3.01684 17.0832 3.06983 17.0832 3.12508V16.8751C17.0832 16.9303 17.0612 16.9833 17.0221 17.0224C16.9831 17.0615 16.9301 17.0834 16.8748 17.0834H3.12484C3.06958 17.0834 3.01659 17.0615 2.97752 17.0224C2.93845 16.9833 2.9165 16.9303 2.9165 16.8751V3.12508Z"
        fill="currentColor"
      />
    </svg>
  );
};

const Help = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.2325 6.26583C9.20833 5.41167 10.7917 5.41167 11.7675 6.26583C12.7442 7.12 12.7442 8.505 11.7675 9.35917C11.5983 9.50833 11.4092 9.63083 11.2092 9.7275C10.5883 10.0283 10.0008 10.56 10.0008 11.25V11.875M17.5 10C17.5 10.9849 17.306 11.9602 16.9291 12.8701C16.5522 13.7801 15.9997 14.6069 15.3033 15.3033C14.6069 15.9997 13.7801 16.5522 12.8701 16.9291C11.9602 17.306 10.9849 17.5 10 17.5C9.01509 17.5 8.03982 17.306 7.12987 16.9291C6.21993 16.5522 5.39314 15.9997 4.6967 15.3033C4.00026 14.6069 3.44781 13.7801 3.0709 12.8701C2.69399 11.9602 2.5 10.9849 2.5 10C2.5 8.01088 3.29018 6.10322 4.6967 4.6967C6.10322 3.29018 8.01088 2.5 10 2.5C11.9891 2.5 13.8968 3.29018 15.3033 4.6967C16.7098 6.10322 17.5 8.01088 17.5 10ZM10 14.375H10.0067V14.3817H10V14.375Z"
        stroke="#929292"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sidebar;
