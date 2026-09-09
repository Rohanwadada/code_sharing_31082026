'use client';

import { createContext, useContext, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({ children }) => {
  const [confirmation, setConfirmation] = useState(null);

  const confirm = (options) =>
    new Promise((resolve) =>
      setConfirmation({
        ...options,
        onConfirm: () => {
          resolve(true);
          setConfirmation(null);
        },
        onCancel: () => {
          resolve(false);
          setConfirmation(null);
        },
      }),
    );

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {confirmation && (
          <ConfirmationModal
            type={confirmation.type}
            title={confirmation.title}
            message={confirmation.message}
            onConfirm={confirmation.onConfirm}
            onCancel={confirmation.onCancel}
            additionalProps={confirmation?.additionalProps || {}}
          />
        )}
      </AnimatePresence>
    </ConfirmationContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmationContext);
