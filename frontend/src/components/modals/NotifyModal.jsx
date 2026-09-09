import styles from './NotifyModal.module.css';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { useRoadmapStore } from '@/store/roadmapStore';
import { addNotification } from '@/service/backgroundJob.service';

const NotifyModal = ({ jobId, notificationType, content }) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const setShowNotificationModal = useRoadmapStore(
    (s) => s.setShowNotificationModal,
  );

  const onNotifyClick = async () => {
    try {
      if (!jobId) return;
      const data = {
        e: userDetails.email,
        j_id: jobId,
        channels: [
          {
            type: 'EMAIL',
            value: userDetails.email,
          },
        ],
        content: { ...content },
        notification_type: notificationType,
      };
      const responseData = await addNotification(data);
    } catch (error) {
      console.error(error);
    } finally {
      setShowNotificationModal(false);
    }
  };

  const onCloseModal = () => {
    setShowNotificationModal(false);
  };

  return (
    <motion.div
      className={styles['nm-main-ct']}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.3, type: 'spring', bounce: 0.3 }}
    >
      <span className={styles['nm-text']}>
        Want to be notified when Shifu responds?
      </span>
      <div className={styles['btn-ct']}>
        <button className={styles['nm-btn']} onClick={onNotifyClick}>
          Notify
        </button>
        <CloseIcon onClick={onCloseModal} />
      </div>
    </motion.div>
  );
};

const CloseIcon = ({ width = 26, height = 26, ...props }) => {
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
        d="M6 18L18 6M6 6L18 18"
        stroke="#000000"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default NotifyModal;
