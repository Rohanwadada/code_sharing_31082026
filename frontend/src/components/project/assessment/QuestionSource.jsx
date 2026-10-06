'use client';

import React, { useEffect } from 'react';
import classes from './AssessmentSteps.module.css';
import aiInterView from '@/assets/assessment/ai-interview.svg';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useProjectStore } from '@/store/projectStore';
import {
  assessmentFormationSourceType,
  useAssessmentFormationStore,
} from '@/store/assessmentFormationStore';

const QuestionSource = ({ projectId }) => {
  const fetchProjectDetails = useProjectStore((s) => s.fetchProjectDetails);
  const saveWizardStep = useProjectStore((s) => s.saveWizardStep);
  const setAssessmentFormationSource = useAssessmentFormationStore(
    (s) => s.setAssessmentFormationSource,
  );

  const router = useRouter();

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
  }, [projectId, fetchProjectDetails]);

  const handleCardClick = (source) => {
    if (projectId) {
      saveWizardStep(
        projectId,
        'step_3_question_source',
        `/project/${projectId}/assessment/question-source`,
        {
          route: `/project/${projectId}/assessment/question-source`,
          is_completed: true,
          data: { question_source: source },
        }
      );
    }

    if (source === 'ai') {
      router.push(`/project/${projectId}/assessment/source-competency`);
    } else if (source === 'manual') {
      setAssessmentFormationSource(
        assessmentFormationSourceType.QUESTION_UPLOAD,
      );
      router.push(`/project/${projectId}/assessment/upload-questions`);
    }
  };


  return (
    <div className={classes['page-container']}>
      <h1 className={classes['page-title']}>
        How should the questions be created?
      </h1>

      <h2 className={classes['section-prompt']}>
        Pick a source — both map to the same confirmed skill structure.
      </h2>

      <div className={classes['cards-grid']}>
        {/* Upload Card */}
        <div
          className={classes['card']}
          onClick={() => handleCardClick('manual')}
        >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <h3 className={classes['card-title']}>Upload Your Questions</h3>
          <p className={classes['card-description']}>
            Bring your own competency-sub-competency sheet. Every row starts as
            Non-negotiable — retag as you like.
          </p>
        </div>

        {/* Generate with AI Card */}
        <div className={classes['card']} onClick={() => handleCardClick('ai')}>
          <div className={classes['icon-wrapper']}>
            <Image src={aiInterView} alt="" />
          </div>
          <h3 className={classes['card-title']}>Generate with AI</h3>
          <p className={classes['card-description']}>
            Shifu reads the JD and drafts competencies, sub-competencies and a
            suggested priority for each.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuestionSource;
