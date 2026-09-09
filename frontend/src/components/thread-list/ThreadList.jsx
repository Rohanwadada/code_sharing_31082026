'use client';

import { useSidebarStore } from '@/store/sidebarStore';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './ThreadList.module.css';
import { useEffect, useMemo, useState } from 'react';
import { useThreadStore } from '@/store/threadStore';
import { ThreadType } from '@/utils/thread';
import { useAuthStore } from '@/store/authStore';
import { useArtifactStore } from '@/store/artifactStore';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { useRouter } from 'next/navigation';
import Skeleton from '../utility/Skeleton';
import {
  deleteThread,
  getAllUserThread,
  updateThread,
} from '@/service/thread.service';

const ThreadList = () => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const threads = useSidebarStore((s) => s.threads);
  const setThreads = useSidebarStore((s) => s.setThreads);
  const setIsSidebarOpen = useSidebarStore((s) => s.setIsSidebarOpen);

  const setMessages = useThreadStore((s) => s.setMessages);
  const setThreadId = useThreadStore((s) => s.setThreadId);
  const setIsArtifactOpen = useThreadStore((s) => s.setIsArtifactOpen);

  const setArtifactData = useArtifactStore((s) => s.setArtifactData);
  const setChatMinimized = useThreadStore((s) => s.setChatMinimized);

  const { isMobile } = useWindowDimensions();

  const [isThreadsFetching, setIsThreadsFetching] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState('');

  const router = useRouter();

  const title = 'Roadmap Chats';

  const getDateLabel = (timestamp) => {
    if (!timestamp) return;
    const now = new Date();
    const date = new Date(timestamp);

    // Normalize both dates to midnight for accurate day diff
    const nowMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const updatedMidnight = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const diffTime = nowMidnight - updatedMidnight;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays === 7) return '1 week ago';
    if (diffDays < 30) return `${diffDays} days ago`;

    // Format dd/mm/yyyy
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  };

  const filteredThreads = useMemo(() => {
    if (!searchTerm) return threads;
    return threads.filter((t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [threads, searchTerm]);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === id ? null : id));
  };

  const handleRenameStart = (e, thread) => {
    e.stopPropagation();
    setRenamingId(thread.slug);
    setNewName(thread.title);
    setMenuOpenId(null);
  };

  const handleRenameSubmit = (e, slug) => {
    e.stopPropagation();
    if (newName.trim()) {
      if (newName != '') {
        handleRenameThread(slug, newName);
      }
    }
    setRenamingId(null);
  };

  const handleRenameThread = async (slug, newTitle) => {
    try {
      const data = {
        title: newTitle,
      };
      const responseData = await updateThread(slug, data);
      const updatedThreads = threads.map((t) =>
        t.slug === slug ? { ...t, title: newTitle } : t,
      );
      setThreads(updatedThreads);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteThread = async (slug) => {
    try {
      const responseData = await deleteThread(slug);
      const updatedThreads = threads.filter((t) => t.slug !== slug);
      setThreads(updatedThreads);
    } catch (error) {
      console.error(error);
    }
  };

  const handleThreadClick = (event, thread) => {
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

    const slug = thread.slug;

    setIsArtifactOpen(false);
    setArtifactData(null);
    setChatMinimized(false);
    setThreadId(slug);
    setMessages([]);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    router.push(`/shifu/${slug}`);
  };

  const handleCLose = () => {
    window.history.back();
  };

  useEffect(() => {
    const getAllThreads = async () => {
      if (!userDetails?.email) return;
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
    getAllThreads();
  }, [setThreads, userDetails?.email]);

  return (
    <div className={styles['container']}>
      <motion.div
        className={styles['container-inner']}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <div className={styles['header-wrapper']}>
          <div className={styles['header']}>
            <div className={styles['header-left']}>
              <h2 className={styles['title']}>{title}</h2>
              <span className={styles['count']}>
                {threads.length} Conversations
              </span>
            </div>
            <button className={styles['close-btn']} onClick={handleCLose}>
              <CloseIcon stroke={'#000000'} />
            </button>
          </div>

          <div className={styles['search-container']}>
            {isThreadsFetching ? (
              <Skeleton animationType="wave" height={'50px'} />
            ) : (
              <input
                type="text"
                placeholder="Search Roadmaps"
                className={styles['search-field']}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className={styles['thread-list']}>
          {isThreadsFetching ? (
            <Skeleton animationType="wave" count={10} gap={5} />
          ) : (
            filteredThreads.map((t, idx) => (
              <div
                key={idx}
                className={`${styles['thread-item']} ${isMobile && menuOpenId === t.slug ? styles['thread-item-active'] : ''} ${isMobile && menuOpenId && menuOpenId !== t.slug ? styles['thread-item-dimmed'] : ''}`}
                onClick={(e) => {
                  handleThreadClick(e, t);
                }}
              >
                <div className={styles['thread-item-left']}>
                  {renamingId === t.slug ? (
                    <input
                      autoFocus
                      className={styles['rename-input']}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={(e) => handleRenameSubmit(e, t.slug)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleRenameSubmit(e, t.slug)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className={styles['thread-title']}>{t.title}</div>
                  )}
                  <div className={styles['thread-date']}>
                    {getDateLabel(t?.updated_at) || 'Unknown date'}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    className={styles['more-btn']}
                    onClick={(e) => toggleMenu(e, t.slug)}
                  >
                    <MoreIcon selected={menuOpenId === t.slug} />
                  </button>

                  <AnimatePresence>
                    {menuOpenId === t.slug && (
                      <>
                        {/* Transparent backdrop — click it to close the menu */}
                        <div
                          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                          }}
                        />
                        <motion.div
                          className={styles['action-menu']}
                          style={{ zIndex: 1000 }}
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          {!t.saved && (
                            <button
                              className={styles['menu-item']}
                              onClick={(e) => handleRenameStart(e, t)}
                            >
                              <EditIcon /> Rename
                            </button>
                          )}
                          <button
                            className={`${styles['menu-item']} ${styles['delete-item']}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteThread(t.slug);
                              setMenuOpenId(null);
                            }}
                          >
                            <TrashIcon /> Delete
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

const CloseIcon = ({ width = 24, height = 24, ...props }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#64748b"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 6L6 18M6 6L18 18" />
  </svg>
);

const SparkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
  >
    <g clipPath="url(#clip0_370_7477)">
      <path
        d="M0.833252 4.99992C3.33325 5.2777 4.72214 6.66659 4.99992 9.16659C5.2777 6.66659 6.66659 5.2777 9.16659 4.99992C6.66659 4.72214 5.2777 3.33325 4.99992 0.833252C4.72214 3.33325 3.33325 4.72214 0.833252 4.99992Z"
        stroke="#3E4554"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_370_7477">
        <rect width="10" height="10" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const MoreIcon = ({ width = 24, height = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      d="M12 6.75C11.8011 6.75 11.6103 6.67098 11.4697 6.53033C11.329 6.38968 11.25 6.19891 11.25 6C11.25 5.80109 11.329 5.61032 11.4697 5.46967C11.6103 5.32902 11.8011 5.25 12 5.25C12.1989 5.25 12.3897 5.32902 12.5303 5.46967C12.671 5.61032 12.75 5.80109 12.75 6C12.75 6.19891 12.671 6.38968 12.5303 6.53033C12.3897 6.67098 12.1989 6.75 12 6.75ZM12 12.75C11.8011 12.75 11.6103 12.671 11.4697 12.5303C11.329 12.3897 11.25 12.1989 11.25 12C11.25 11.8011 11.329 11.6103 11.4697 11.4697C11.6103 11.329 11.8011 11.25 12 11.25C12.1989 11.25 12.3897 11.329 12.5303 11.4697C12.671 11.6103 12.75 11.8011 12.75 12C12.75 12.1989 12.671 12.3897 12.5303 12.5303C12.3897 12.671 12.1989 12.75 12 12.75ZM12 18.75C11.8011 18.75 11.6103 18.671 11.4697 18.5303C11.329 18.3897 11.25 18.1989 11.25 18C11.25 17.8011 11.329 17.6103 11.4697 17.4697C11.6103 17.329 11.8011 17.25 12 17.25C12.1989 17.25 12.3897 17.329 12.5303 17.4697C12.671 17.6103 12.75 17.8011 12.75 18C12.75 18.1989 12.671 18.3897 12.5303 18.5303C12.3897 18.671 12.1989 18.75 12 18.75Z"
      stroke={props.selected ? '#00F0FF' : 'black'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
  >
    <path
      d="M14.0517 3.73913L15.4575 2.33246C15.7506 2.0394 16.148 1.87476 16.5625 1.87476C16.977 1.87476 17.3744 2.0394 17.6675 2.33246C17.9606 2.62553 18.1252 3.02301 18.1252 3.43746C18.1252 3.85192 17.9606 4.2494 17.6675 4.54246L5.69333 16.5166C5.25277 16.9569 4.70947 17.2806 4.1125 17.4583L1.875 18.125L2.54167 15.8875C2.7194 15.2905 3.04303 14.7472 3.48333 14.3066L14.0525 3.73913H14.0517ZM14.0517 3.73913L16.25 5.93746"
      stroke="#485363"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BookmarkIcon = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill={filled ? '#00f0ff' : 'none'}
    stroke={filled ? '#00f0ff' : '#64748b'}
  >
    <path
      d="M14.6608 2.76838C15.5775 2.87505 16.25 3.66588 16.25 4.58922V17.5L10 14.375L3.75 17.5V4.58922C3.75 3.66588 4.42167 2.87505 5.33917 2.76838C8.43599 2.40891 11.564 2.40891 14.6608 2.76838Z"
      stroke="#485363"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
  >
    <path
      d="M12.2833 7.49995L11.995 14.9999M8.005 14.9999L7.71667 7.49995M16.0233 4.82495C16.3083 4.86828 16.5917 4.91411 16.875 4.96328M16.0233 4.82495L15.1333 16.3941C15.097 16.8651 14.8842 17.3051 14.5375 17.626C14.1908 17.9469 13.7358 18.1251 13.2633 18.1249H6.73667C6.26425 18.1251 5.80919 17.9469 5.46248 17.626C5.11578 17.3051 4.90299 16.8651 4.86667 16.3941L3.97667 4.82495M16.0233 4.82495C15.0616 4.67954 14.0948 4.56919 13.125 4.49411M3.97667 4.82495C3.69167 4.86745 3.40833 4.91328 3.125 4.96245M3.97667 4.82495C4.93844 4.67955 5.9052 4.56919 6.875 4.49411M13.125 4.49411V3.73078C13.125 2.74745 12.3667 1.92745 11.3833 1.89661C10.4613 1.86714 9.53865 1.86714 8.61667 1.89661C7.63333 1.92745 6.875 2.74828 6.875 3.73078V4.49411M13.125 4.49411C11.0448 4.33334 8.95523 4.33334 6.875 4.49411"
      stroke="#DB262C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ThreadList;
