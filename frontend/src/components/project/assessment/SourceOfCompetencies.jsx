'use client';

import React from 'react';
import classes from './AssessmentSteps.module.css';
import aiInterView from '@/assets/assessment/ai-interview.svg';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import {
  assessmentFormationSourceType,
  useAssessmentFormationStore,
} from '@/store/assessmentFormationStore';

const SourceOfCompetencies = ({ projectId }) => {
  const currentProjectName = useProjectStore((s) => s.currentProjectName);

  const setAssessmentFormationSource = useAssessmentFormationStore(
    (s) => s.setAssessmentFormationSource,
  );

  const router = useRouter();

  const handleCardClick = (source) => {
    console.log('ASourse: ', source);
    setAssessmentFormationSource(source);
    if (source === assessmentFormationSourceType.COMPTENCY_UPLOAD) {
      // Adjust this route to match your App.js routing setup
      router.push(`/project/${projectId}/assessment/upload-competency`);
    } else if (source === assessmentFormationSourceType.AI_GENERATE) {
      // Adjust this route to match your App.js routing setup
      router.push(
        `/project/${projectId}/assessment/review-generated-competencies`,
      );
    }
  };

  return (
    <div className={classes['page-container']}>
      <h1 className={classes['page-title']}>Source of Competencies</h1>
      <p className={classes['page-subtitle']}>
        Build your question set for each assessment stage
      </p>

      <div className={classes['info-tags-container']}>
        <div className={classes['info-tag-group']}>
          <span>Project:</span>
          <span className={classes['info-tag']}>
            {currentProjectName || 'Unknown Project'}
          </span>
        </div>
        {/* <div className={classes["info-tag-group"]}>
          <span>Experience Level:</span>
          <span className={classes["info-tag-desg"]}>Mid Senior</span>
        </div>*/}
      </div>

      <h2 className={classes['section-prompt']}>
        How would you like to define the competencies for this role?
      </h2>

      <div className={classes['cards-grid']}>
        <div
          className={classes['card']}
          onClick={() =>
            handleCardClick(assessmentFormationSourceType.COMPTENCY_UPLOAD)
          }
        >
          <div className={classes['icon-wrapper']}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <h3 className={classes['card-title']}>Upload Your Own Competency</h3>
          <p className={classes['card-description']}>
            Bring your own competency-sub-competency sheet. Every row starts as
            Non-negotiable — retag as you like.
          </p>
        </div>

        {/* Generate Competency with AI */}
        <div
          className={classes['card']}
          onClick={() =>
            handleCardClick(assessmentFormationSourceType.AI_GENERATE)
          }
        >
          <div className={classes['icon-wrapper']}>
            <Image src={aiInterView} alt="" />
          </div>
          <h3 className={classes['card-title']}>Generate Competency with AI</h3>
          <p className={classes['card-description']}>
            Shifu reads the JD and drafts competencies, sub-competencies and a
            suggested priority for each.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SourceOfCompetencies;
