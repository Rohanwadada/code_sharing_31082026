import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, X } from 'lucide-react';
import shifuIcon from '@/assets/bot/thinking.png';
import styles from './NodeContentAiLoader.module.css';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CHAPTER_WORDS = [
  'Analyzing core concepts...',
  'Structuring study content...',
  'Synthesizing practical examples...',
  'Finalizing resources...',
];

const ASSESSMENT_WORDS = [
  'Evaluating module chapters...',
  'Formulating targeted questions...',
  'Synthesizing rubrics & explanations...',
  'Finalizing assessment...',
];

export const NodeContentAiLoader = ({ selectedNode, closePopup }) => {
  const isAssessment =
    selectedNode?.type === 'assignmentNode' ||
    selectedNode?.data?.semanticType === 'assessment';

  const nodeTitle =
    selectedNode?.data?.label ||
    (isAssessment ? 'Module Assessment' : 'Chapter Content');

  const wordList = isAssessment ? ASSESSMENT_WORDS : CHAPTER_WORDS;
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev < wordList.length - 1 ? prev + 1 : prev));
    }, 2400);

    return () => clearInterval(timer);
  }, [wordList.length]);

  return (
    <div className={styles.loaderContainer}>
      {/* Top Header Bar with Close button */}
      <div className={styles.topBar}>
        {closePopup && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={closePopup}
            title="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Centered Circular Process Area */}
      <div className={styles.centerWrapper}>
        <div className={styles.circleWrapper}>
          {/* Subtle Outer Dashed Aura */}
          <div className={styles.auraRing} />

          {/* SVG Circular Process Gauge */}
          <svg className={styles.svgRing} viewBox="0 0 130 130">
            <defs>
              <linearGradient id="goldCyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle
              className={styles.bgCircle}
              cx="65"
              cy="65"
              r={RADIUS}
            />

            {/* Rotating Process Arc */}
            <circle
              className={styles.progressCircle}
              cx="65"
              cy="65"
              r={RADIUS}
              strokeDasharray={`${CIRCUMFERENCE * 0.7} ${CIRCUMFERENCE * 0.3}`}
              strokeDashoffset="0"
            />
          </svg>

          {/* Central Thematic Badge - Original Shifu Bot Icon */}
          <div className={styles.centerBadge}>
            <Image
              src={shifuIcon}
              alt="Shifu AI"
              width={54}
              height={54}
              className={styles.shifuLogoImg}
              priority
            />
          </div>
        </div>

        {/* Minimalist Captions Underneath */}
        <div className={styles.captionWrapper}>
          <div className={styles.nodeTitleMini} title={nodeTitle}>
            {nodeTitle}
          </div>
          <div className={styles.statusWord}>
            <span className={styles.liveDot} />
            <span>{wordList[wordIndex]}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeContentAiLoader;
