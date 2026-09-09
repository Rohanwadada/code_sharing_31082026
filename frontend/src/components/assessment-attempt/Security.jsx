'use client';

import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import Modal from '@/components/assessment-attempt/Modal';
import { usePathname, useRouter } from 'next/navigation';

// 1. Create the Context
const SecurityContext = createContext(null);

// 2. Export a custom hook so children can easily grab the functions
export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a Security provider');
  }
  return context;
};

const Security = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [closeModal, setCloseModal] = useState(() => () => {
    setShowModal(false);
  });
  const [activateEventListner, setActivateEventListner] = useState(false);

  const detectDevTools = () => {
    const threshold = 200;
    return (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    );
  };

  useEffect(() => {
    const handleDevToolsDetection = () => {
      if (detectDevTools()) {
        setModalMessage(
          'Developer tools are detected! Please close it and start your assessment.',
        );
        setShowModal(true);
        setCloseModal(() => {
          return () => {
            setShowModal(false);
            router.push('/');
          };
        });
      }
    };

    const forceFullScreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error('Fullscreen request failed:', err);
        });
      }
    };

    const isAssessmentPage =
      pathname === '/questions' ||
      pathname === '/daksh-session' ||
      pathname.includes('/assessment/attempt') ||
      pathname.startsWith('/assessment');

    const handleKeyDown = (event) => {
      if (
        (event.ctrlKey && event.shiftKey && event.key === 'I') ||
        (event.ctrlKey && event.shiftKey && event.key === 'J') ||
        (event.ctrlKey && event.key === 'U') ||
        event.key === 'F12' ||
        (event.ctrlKey && event.key === 'r') ||
        (event.metaKey && event.key === 'r') ||
        (event.ctrlKey && event.shiftKey && event.key === 'R') ||
        event.key === 'F5'
      ) {
        event.preventDefault();
      }

      if (isAssessmentPage) {
        if (
          event.key === 'Escape' ||
          event.key === 'F11' ||
          (event.altKey && event.key === 'Tab') ||
          (event.metaKey && event.key.toLowerCase() === 'd') ||
          (event.ctrlKey && event.metaKey && event.key.toLowerCase() === 'd')
        ) {
          event.preventDefault();
          event.stopPropagation();

          if (event.key === 'Escape') {
            setModalMessage('Fullscreen mode is required for this assessment.');
            setShowModal(true);
            setCloseModal(() => () => {
              setShowModal(false);
              forceFullScreen();
            });
          }
        }
      }
    };

    const handleBlur = () => {
      if (isAssessmentPage) {
        setModalMessage(
          'Tab switching is restricted. Exam will submit after excessive switching.',
        );
        setShowModal(true);
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isAssessmentPage) {
        setModalMessage('Fullscreen mode is required for this assessment.');
        setShowModal(true);
        setCloseModal(() => () => {
          setShowModal(false);
          forceFullScreen();
        });
      }
    };

    if (isAssessmentPage) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [pathname, router]);

  // 3. Store functions inside a memoized object to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    setShowModal,
    setModalMessage,
    setCloseModal,
    setActivateEventListner,
  }), []);

  return (
    <SecurityContext.Provider value={contextValue}>
      {showModal && <Modal message={modalMessage} onClose={closeModal} />}
      {children}
    </SecurityContext.Provider>
  );
};

export default Security;
