'use client';

import React, { useEffect, useState, useRef } from 'react';
import Modal from '@/components/assessment-attempt/Modal';
import { usePathname, useRouter } from 'next/navigation';

const BlockBackNavigation = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const childRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    // Push the current state into the browser's history stack
    const pushCurrentState = () =>
      window.history.pushState(null, '', window.location.href);
    pushCurrentState();

    const handlePopState = () => {
      if (pathname === '/questions' || pathname === '/submit') {
        // Re-push the state immediately to block the navigation
        pushCurrentState();
        // Show the modal
        setModalMessage('Back navigation is disabled on this page.');
        setShowModal(true);
      } else if (pathname.startsWith('/result')) {
        // Redirect to `/courses` on back navigation from `/result`
        router.push('/', { replace: true });
      }
    };

    // Add the popstate event listener
    window.addEventListener('popstate', handlePopState);

    return () => {
      // Remove the event listener on component unmount
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, navigate]);

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>{showModal && <Modal message={modalMessage} onClose={closeModal} />}</>
  );
};

export const ConditionalBlockBackNavigation = ({ children }) => {
  const pathname = usePathname();
  const routesWithBlock = ["/questions", "/submit", "/result"];

  return (
    <>
      {routesWithBlock.some((route) => pathname.startsWith(route)) && (
        <BlockBackNavigation />
      )}
      {children}
    </>
  );
};

export default BlockBackNavigation;
