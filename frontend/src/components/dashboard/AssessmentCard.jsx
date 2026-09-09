import { useRouter } from 'next/navigation';

import styles from './RoadmapCard.module.css';
import { motion } from 'framer-motion';

const AssessmentCard = ({ cardData }) => {
  const router = useRouter();

  const isSubmitted = cardData?.submissions?.length > 0;
  const isOwner = cardData?.owner === true;
  const cardUrl = isSubmitted ? cardData.submissions[0].result : cardData?.assessment_url;

  const handleSendClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(
      `/project/${cardData.project_id}/assessment/${cardData.assessment_id}/access`,
    );
  };

  return (
    <a
      href={cardUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles['card-link']}
      title={cardData?.assessment_name || 'Assessment'}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={styles['card-ct']}
      >
        <div className={styles['top']}>
          <div className={styles['title']}>{cardData?.assessment_name || 'Skill Gap Assessment'}</div>
          <div className={styles['tag-ct']}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                background: isSubmitted ? '#e6f4ea' : '#fff3e0',
                color: isSubmitted ? '#1e7e34' : '#e65100',
              }}
            >
              {isSubmitted ? 'Submitted' : 'Pending'}
            </span>
          </div>
        </div>
        <div className={styles['bottom']}>
          <div className={styles['bottom-left']}>
            <span className={styles['date']}>
              {isSubmitted
                ? `${cardData.submissions.length} submission${cardData.submissions.length > 1 ? 's' : ''}`
                : 'No submissions yet'}
            </span>
          </div>
          {isOwner && (
            <div className={styles['action-ct']}>
              <button
                className={styles['action-btn']}
                onClick={handleSendClick}
                title="send assessment"
              >
                <Send width={16} height={16} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </a>
  );
};

const Send = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M14.5 1.5L7.75 8.25M14.5 1.5L10 14.5L7.75 8.25M14.5 1.5L1.5 6L7.75 8.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AssessmentCard;
