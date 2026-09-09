import { createPortal } from 'react-dom';
import styles from './ConfirmationModal.module.css';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import Button from '../ui/Button';

const animationVariants = {
  backdrop: {
    hidden: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
  },
  modal: {
    hidden: {
      // y: 20,
      scale: 0.95,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
    visible: {
      // y: 0,
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
  },
};

const ConfirmationModal = ({
  type = 'general',
  title,
  message,
  onConfirm,
  onCancel,
  additionalProps = {},
}) => {
  if (type === 'revoke-access-confirmation') {
    return (
      <RevokeAccessConfirmationModal
        title={title}
        message={message}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  } else if (type === 'delete-roadmap-confirmation') {
    console.log(additionalProps);
    return (
      <DeleteRoadmapConfirmationModal
        title={title}
        message={message}
        onConfirm={onConfirm}
        onCancel={onCancel}
        additionalProps={additionalProps}
      />
    );
  }
};

const RevokeAccessConfirmationModal = ({
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  return (
    <motion.div
      className={styles['modal-backdrop']}
      onClick={onCancel}
      variants={animationVariants.backdrop}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="backdrop"
    >
      <motion.div
        className={styles['modal']}
        onClick={(e) => e.stopPropagation()}
        variants={animationVariants.modal}
        initial="hidden"
        animate="visible"
        exit="hidden"
        key="modal"
      >
        <div className={styles['modal-title']}>
          <p
            className={styles['modal-message']}
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </div>
        <div className={styles['button-ct']}>
          <Button
            variant="secondary"
            size="sm"
            className={`${styles['cf-btn']} ${styles['cancel']}`}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className={`${styles['cf-btn']} ${styles['yes']}`}
            onClick={onConfirm}
          >
            Yes
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const DeleteRoadmapConfirmationModal = ({
  title,
  message,
  onConfirm,
  onCancel,
  additionalProps = {},
}) => {
  return (
    <motion.div
      className={styles['modal-backdrop']}
      onClick={onCancel}
      variants={animationVariants.backdrop}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="backdrop"
    >
      <motion.div
        className={styles['dr-modal']}
        onClick={(e) => e.stopPropagation()}
        variants={animationVariants.modal}
        initial="hidden"
        animate="visible"
        exit="hidden"
        key="modal"
      >
        <div className={styles['dr-modal-title']}>{title}</div>
        <div className={styles['dr-button-ct']}>
          <Button
            variant="secondary"
            size="sm"
            className={`${styles['dr-cf-btn']} ${styles['dr-cancel']}`}
            onClick={onCancel}
          >
            {additionalProps?.cancelMessage || 'Cancel'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className={`${styles['dr-cf-btn']} ${styles['dr-yes']}`}
            onClick={onConfirm}
          >
            {additionalProps?.yesMessage || 'Yes'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmationModal;
