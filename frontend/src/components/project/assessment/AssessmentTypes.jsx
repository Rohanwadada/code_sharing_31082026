'use client';

import React from 'react';
import classes from './AssessmentSteps.module.css';
import aiInterView from '@/assets/assessment/ai-interview.svg';
import useCase from '@/assets/assessment/use-case.svg';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import Image from 'next/image';

const AssessmentTypes = ({ projectId }) => {
  const currentProjectName = useProjectStore((s) => s.currentProjectName);
  const router = useRouter();

  const handleCardClick = (type) => {
    if (type === 'MCQ') {
      router.push(`/project/${projectId}/assessment/question-source`);
    }

    // if (type === 'AI') {
    //   router.push(
    //     `/project/${projectId}/assessment/question-source-ai-interview`,
    //   );
    // }
  };

  return (
    <div className={classes['page-container']}>
      <h1 className={classes['page-title']}>Assessment Types</h1>

      <div className={classes['info-tags-container']}>
        <div className={classes['info-tag-group']}>
          <span>Project:</span>
          <span className={classes['info-tag']}>{currentProjectName}</span>
        </div>
        {/* <div className={classes["info-tag-group"]}>
          <span>Experience Level:</span>
          <span className={classes["info-tag-desg"]}>Mid Senior</span>
        </div>*/}
      </div>

      <h2 className={classes['section-prompt']}>
        Select the assessment type for this test
      </h2>

      <div className={classes['cards-grid']}>
        {/* MCQ Card */}
        <div className={classes['card']} onClick={() => handleCardClick('MCQ')}>
          <div className={classes['icon-wrapper']}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3 className={classes['card-title']}>MCQ</h3>
          <p className={classes['card-description']}>
            Objective, auto-scored multiple-choice questions
          </p>
        </div>

        {/* AI Interview Card */}
        <div className={`${classes['card']} ${classes['disabled']}`} onClick={() => handleCardClick('AI')}>
          <div className={classes['icon-wrapper']}>
            <Image src={aiInterView} alt="" />
          </div>
          <h3 className={classes['card-title']}>AI Interview</h3>
          <p className={classes['card-description']}>
            You set how many questions Daksh generates per sub-competency; each
            candidate gets a unique random draw from the pool.
          </p>
        </div>

        {/* Use Case Card */}
        <div
          className={`${classes['card']} ${classes['disabled']}`}
          onClick={() => handleCardClick('UseCase')}
        >
          <div className={classes['icon-wrapper']}>
            <Image src={useCase} alt="" />
          </div>
          <h3 className={classes['card-title']}>Use Case</h3>
          <p className={classes['card-description']}>
            You set how many questions Daksh generates per sub-competency; each
            candidate gets a unique random draw from the pool.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentTypes;
