import { useAuthStore } from '@/store/authStore';
import { ADMIN_ROLE } from '@/utils/constants';

import styles from './RoadmapCard.module.css';
import Link from 'next/link';
import GenerationModeTag from './tags/GenerationModeTag';
import LevelTag from './tags/LevelTag';
import TimeCommitmentTag from './tags/TimeCommitmentTag';
import { motion } from 'framer-motion';

const MotionLink = motion.create(Link);

const RoadmapCard = ({
  cardData,
  onEditClick,
  onCloneClick,
  onDeleteClick,
}) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const formatTimestamp = (timestamp) => {
    const inputDate = new Date(timestamp);
    const now = new Date();

    // Start of today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of input date
    const targetDay = new Date(
      inputDate.getFullYear(),
      inputDate.getMonth(),
      inputDate.getDate(),
    );

    const diffTime = today - targetDay;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 1. Today
    if (diffDays === 0) {
      return 'today';
    }

    // 2. Yesterday
    if (diffDays === 1) {
      return 'yesterday';
    }

    // 3. Less than one week
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    const shortMonth = inputDate.toLocaleString('en-US', {
      month: 'short',
    });

    const date = inputDate.getDate();

    // 4. Current year
    if (inputDate.getFullYear() === now.getFullYear()) {
      return `${date} ${shortMonth}`;
    }

    // 5. Different year
    return `${date} ${shortMonth} ${inputDate.getFullYear()}`;
  };

  return (
    <MotionLink
      href={`/project/${cardData.project_id}/roadmap/${cardData.id}`}
      className={styles['card-link']}
      title={cardData?.title || 'Untitled Roadmap'}
      layout="position"
      transition={{
        layout: {
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={styles['card-ct']}
      >
        <div className={styles['top']}>
          <div className={styles['title']}>
            {cardData?.title || 'Untitled Roadmap'}
          </div>
          <div className={styles['tag-ct']}>
            {cardData?.mode === 'ai-generated' && (
              <GenerationModeTag
                type={
                  cardData?.has_manual_edits === true
                    ? 'ai-assisted'
                    : 'ai-generated'
                }
              />
            )}

            {cardData?.mode === 'manual' && cardData?.status === 'draft' && (
              <GenerationModeTag type={'draft'} />
            )}

            {cardData?.mode === 'manual' && <LevelTag text={cardData?.level} />}

            {cardData?.mode === 'ai-generated' && (
              <TimeCommitmentTag text={cardData?.time_commitment_tier} />
            )}
          </div>
        </div>
        <div className={styles['bottom']}>
          <div className={styles['bottom-left']}>
            <Calendar width={16} height={16} />
            <span className={styles['date']}>
              {formatTimestamp(cardData.updated_at)}
            </span>
          </div>
          <div className={styles['action-ct']}>
            {/* #changes_05_10_2026: Only editor and owner can clone */}
            {['editor', 'owner'].includes(cardData?.access) && (
              <button
                className={styles['action-btn']}
                onClick={(e) => onCloneClick(e, cardData)}
                title="clone roadmap"
              >
                <Branch width={16} height={16} />
              </button>
            )}
            {['editor', 'owner'].includes(cardData?.access) && (
              <button
                className={styles['action-btn']}
                onClick={(e) => onEditClick(e, cardData)}
                title="edit roadmap"
              >
                <Pencil width={18} height={18} />
              </button>
            )}
            {cardData?.access === 'owner' && (
              <button
                className={styles['action-btn']}
                onClick={(e) => onDeleteClick(e, cardData)}
                title="delete roadmap"
              >
                <Trash width={13} height={15} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </MotionLink>
  );
};

const Calendar = ({ width = 24, height = 24, ...props }) => {
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
        d="M4.5 2V3.5M11.5 2V3.5M2 12.5V5C2 4.60218 2.15804 4.22064 2.43934 3.93934C2.72064 3.65804 3.10218 3.5 3.5 3.5H12.5C12.8978 3.5 13.2794 3.65804 13.5607 3.93934C13.842 4.22064 14 4.60218 14 5V12.5M14 12.5V7.5C14 7.10218 13.842 6.72064 13.5607 6.43934C13.2794 6.15804 12.8978 6 12.5 6H3.5C3.10218 6 2.72064 6.15804 2.43934 6.43934C2.15804 6.72064 2 7.10218 2 7.5V12.5C2 12.8978 2.15804 13.2794 2.43934 13.5607C2.72064 13.842 3.10218 14 3.5 14H12.5C12.8978 14 13.2794 13.842 13.5607 13.5607C13.842 13.2794 14 12.8978 14 12.5ZM8 8.5H8.00533V8.50533H8V8.5ZM8 10H8.00533V10.0053H8V10ZM8 11.5H8.00533V11.5053H8V11.5ZM6.5 10H6.50533V10.0053H6.5V10ZM6.5 11.5H6.50533V11.5053H6.5V11.5ZM5 10H5.00533V10.0053H5V10ZM5 11.5H5.00533V11.5053H5V11.5ZM9.5 8.5H9.50533V8.50533H9.5V8.5ZM9.5 10H9.50533V10.0053H9.5V10ZM9.5 11.5H9.50533V11.5053H9.5V11.5ZM11 8.5H11.0053V8.50533H11V8.5ZM11 10H11.0053V10.0053H11V10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Action icons
const Branch = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <g clipPath="url(#clip0_434_3064)">
        <path
          d="M3.29492 0.831756C3.71118 0.810561 4.22788 0.959029 4.58484 1.16668C5.16444 1.50211 5.58587 2.05536 5.75528 2.70324C5.92371 3.35155 5.82537 4.0403 5.48223 4.61556C5.19678 5.0929 4.76084 5.46189 4.24289 5.66454C4.09963 5.72044 3.98557 5.74929 3.83718 5.78695C3.82893 6.63662 3.85007 7.50369 3.83531 8.35038C4.36689 7.84851 5.0546 7.54425 5.78354 7.48843C6.02725 7.46892 6.39361 7.47774 6.64683 7.47958L7.93168 7.48371C8.42941 7.48484 8.74285 7.49786 9.23363 7.36878C10.0069 7.16344 10.6867 6.69979 11.1601 6.05483C11.2986 5.86502 11.3628 5.7342 11.4784 5.53654C11.1191 5.33195 10.8271 5.07668 10.5936 4.73315C10.2221 4.18421 10.084 3.51011 10.2099 2.85936C10.3347 2.21265 10.7093 1.64118 11.2525 1.26875C11.8068 0.889717 12.4901 0.749235 13.1489 0.878865C13.8048 1.00808 14.3819 1.3939 14.752 1.95058C15.1189 2.50444 15.251 3.18121 15.1193 3.83236C14.985 4.48752 14.5949 5.062 14.0353 5.42828C13.6493 5.68087 13.2007 5.82113 12.7396 5.83337C12.6541 5.83586 12.5302 5.83748 12.4489 5.8209C12.3829 5.94632 12.3273 6.06791 12.2573 6.19293C12.0275 6.60324 11.7684 6.91752 11.4336 7.24297C10.6885 7.94171 9.73199 8.37265 8.71496 8.46788C8.42511 8.49499 8.13675 8.48733 7.84582 8.48687L6.6314 8.4839C6.16497 8.48296 5.71095 8.44874 5.27151 8.62038C4.63031 8.87085 4.26314 9.2653 3.98566 9.87593C4.14957 9.90022 4.39206 9.97921 4.54496 10.0441C5.19568 10.3216 5.71001 10.8455 5.97543 11.5012C6.24075 12.1601 6.23297 12.8976 5.95383 13.5509C5.67399 14.2034 5.14607 14.7179 4.48652 14.9807C3.82677 15.2416 3.09039 15.2297 2.43941 14.9476C1.78692 14.6646 1.27393 14.1335 1.01371 13.4716C0.757366 12.8129 0.771883 12.0794 1.0541 11.4313C1.30955 10.8447 1.76804 10.3698 2.3454 10.094C2.53777 10.003 2.65271 9.97983 2.83284 9.90983C2.82315 9.64054 2.82962 9.33874 2.82964 9.06749L2.82954 7.56371L2.82953 6.42874C2.82948 6.23638 2.82218 5.97354 2.83415 5.78749C2.37943 5.67913 1.99527 5.49847 1.64856 5.18072C1.14948 4.72753 0.855082 4.09162 0.832426 3.41787C0.810504 2.75497 1.05223 2.1104 1.50466 1.6254C1.98414 1.11163 2.59942 0.856311 3.29492 0.831756ZM3.58987 14.1602C4.50578 14.1109 5.20868 13.3291 5.16078 12.4131C5.11289 11.4971 4.33228 10.793 3.41622 10.8393C2.49803 10.8858 1.79183 11.6687 1.83984 12.5868C1.88785 13.5048 2.67183 14.2098 3.58987 14.1602ZM12.7539 4.82654C13.5771 4.77853 14.2062 4.07344 14.1603 3.25014C14.1146 2.42684 13.4111 1.79587 12.5878 1.83947C11.7612 1.88325 11.1273 2.5899 11.1733 3.41632C11.2193 4.24274 11.9276 4.87472 12.7539 4.82654ZM3.41028 4.8269C4.23566 4.78454 4.87024 4.0808 4.82728 3.25544C4.78432 2.4301 4.08011 1.79603 3.2548 1.83958C2.43032 1.88309 1.79704 2.58642 1.83996 3.41093C1.88287 4.23544 2.58575 4.86922 3.41028 4.8269Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_434_3064">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
const Pencil = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 18 18"
      fill="none"
      {...props}
    >
      <path
        d="M8.25 3.75H4.5C4.10218 3.75 3.72064 3.90803 3.43934 4.18934C3.15804 4.47064 3 4.85217 3 5.25V13.5C3 13.8978 3.15804 14.2794 3.43934 14.5607C3.72064 14.842 4.10218 15 4.5 15H12.75C13.1478 15 13.5294 14.842 13.8107 14.5607C14.092 14.2794 14.25 13.8978 14.25 13.5V9.75M13.1895 2.6895C13.3279 2.54623 13.4934 2.43196 13.6764 2.35335C13.8594 2.27473 14.0562 2.23335 14.2554 2.23162C14.4546 2.22989 14.6521 2.26785 14.8364 2.34327C15.0208 2.41869 15.1883 2.53007 15.3291 2.67091C15.4699 2.81175 15.5813 2.97922 15.6567 3.16357C15.7322 3.34791 15.7701 3.54543 15.7684 3.7446C15.7666 3.94377 15.7253 4.1406 15.6467 4.32361C15.568 4.50661 15.4538 4.67213 15.3105 4.8105L8.871 11.25H6.75V9.129L13.1895 2.6895Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
const Trash = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 13 15"
      fill="none"
    >
      <path
        d="M11.75 3.5L11.0997 12.6065C11.0728 12.9849 10.9035 13.3391 10.6258 13.5977C10.3482 13.8563 9.9829 14 9.6035 14H3.3965C3.0171 14 2.6518 13.8563 2.37416 13.5977C2.09653 13.3391 1.92719 12.9849 1.90025 12.6065L1.25 3.5M5 6.5V11M8 6.5V11M8.75 3.5V1.25C8.75 1.05109 8.67098 0.860322 8.53033 0.71967C8.38968 0.579018 8.19891 0.5 8 0.5H5C4.80109 0.5 4.61032 0.579018 4.46967 0.71967C4.32902 0.860322 4.25 1.05109 4.25 1.25V3.5M0.5 3.5H12.5"
        stroke="#DB262C"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RoadmapCard;
