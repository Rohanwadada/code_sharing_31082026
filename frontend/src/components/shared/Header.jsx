'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import styles from './Header.module.css';
import headerImage from '@/assets/shifu-logo.svg';
import sidebarIcon from '@/assets/thread/sidebar-icon.svg';
import { useAuthStore } from '@/store/authStore';
import { useThreadStore } from '@/store/threadStore';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { useSidebarStore } from '@/store/sidebarStore';
import { updateThread } from '@/service/thread.service';
import searchIcon from "@/assets/search.svg";
import bellIcon from "@/assets/notification.svg";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Header = () => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const threadId = useThreadStore((s) => s.threadId);
  const currentThreadTitle = useThreadStore((s) => s.currentThreadTitle);
  const setCurrentThreadTitle = useThreadStore((s) => s.setCurrentThreadTitle);
  const isSidebarOpen = useSidebarStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useSidebarStore((s) => s.setIsSidebarOpen);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');

  const router = useRouter()
  const pathName = usePathname()
  const { width: windowWidth } = useWindowDimensions();

  const isMobile = windowWidth <= 768;

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const updateThreadTitle = async (newTitle) => {
    try {
      const data = {
        title: newTitle,
      };
      const responseData = await updateThread(threadId, data);
      console.log('Updating title:', newTitle);
      setCurrentThreadTitle(newTitle);
    } catch (err) {
      setTitle(currentThreadTitle);
      console.error(err);
    }
  };

  const handleFinishEdit = () => {
    setIsEditing(false);

    if (title !== currentThreadTitle) {
      updateThreadTitle(title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    }
  };

  const isThreadPage = /^\/project\/[^/]+\/shifu\/[^/]+$/.test(pathName);
  
  const handleLogoClick = () => {
    window.location.href = '/';
  };

  const handleBackClick = () => {
    router.back()
  }

  return (
    <div className={styles['header']}>
      <button className={styles["back-btn"]} onClick={handleBackClick}>
        <span className={styles["chevron-left"]}>&lt;</span> Back
      </button>
      <div className={styles['left-section']}>
        <div className={styles['sidebar-toggle']} onClick={handleToggleSidebar}>
          <Image src={sidebarIcon} alt="sidebar" />
        </div>
        {/* {(threadId || !isMobile) && (
          <Image
            className={styles['header-img']}
            src={headerImage}
            loading="eager"
            alt="header-image"
            onClick={handleLogoClick}
          />
        )}*/}
      </div>
      {!threadId && isMobile && (
        <div className={styles['header-img-primary']}>
          {' '}
          <Image
            width={60}
            height={37}
            src={headerImage}
            loading="eager"
            alt="header-image"
            onClick={handleLogoClick}
          />
        </div>
      )}
      {isThreadPage && threadId && currentThreadTitle && (
        <div className={styles['chat-title-ct']}>
          {isEditing ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={handleKeyDown}
              className={styles['title-input']}
            />
          ) : (
            <span>{currentThreadTitle || 'Untitled'}</span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            onClick={() => {
              setTitle(currentThreadTitle || '');
              setIsEditing(true);
            }}
          >
            <path
              d="M12.3017 2.61437L13.7075 1.20771C14.0006 0.914642 14.398 0.75 14.8125 0.75C15.227 0.75 15.6244 0.914642 15.9175 1.20771C16.2106 1.50077 16.3752 1.89825 16.3752 2.31271C16.3752 2.72716 16.2106 3.12464 15.9175 3.41771L7.06833 12.2669C6.62777 12.7072 6.08447 13.0308 5.4875 13.2085L3.25 13.8752L3.91667 11.6377C4.0944 11.0407 4.41803 10.4974 4.85833 10.0569L12.3017 2.61437ZM12.3017 2.61437L14.5 4.81271M13.25 10.5419V14.5002C13.25 14.9975 13.0525 15.4744 12.7008 15.826C12.3492 16.1777 11.8723 16.3752 11.375 16.3752H2.625C2.12772 16.3752 1.65081 16.1777 1.29917 15.826C0.947544 15.4744 0.75 14.9975 0.75 14.5002V5.75021C0.75 5.25293 0.947544 4.77601 1.29917 4.42438C1.65081 4.07275 2.12772 3.87521 2.625 3.87521H6.58333"
              stroke="var(--text-dark)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <div className={styles["header-actions"]}>
        <button className={styles["action-btn"]}><Image src={searchIcon} alt="Search" /></button>
        <button className={styles["action-btn"]}><Image src={bellIcon} alt="Notifications" /></button>
      </div>
    </div>
  );
};

export default Header;
