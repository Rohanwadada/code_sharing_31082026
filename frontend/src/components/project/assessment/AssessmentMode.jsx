'use client';

// for choosing between static and randomized

import React, { useState } from 'react';
import classes from './AssessmentMode.module.css';
import { useRouter } from 'next/navigation';
import {
  assessmentFormationSourceType,
  useAssessmentFormationStore,
} from '@/store/assessmentFormationStore';
import {
  generateQuestions,
  updateAssessment,
} from '@/service/assessment.service';
import { useProjectStore } from '@/store/projectStore';

const AssessmentMode = ({ projectId, assessmentId }) => {
  const projectName = useProjectStore((s) => s.currentProjectName);

  const assessmentFormationId = useAssessmentFormationStore(
    (s) => s.assessmentFormationId,
  );
  const assessmentFormationDetails = useAssessmentFormationStore(
    (s) => s.assessmentFormationDetails,
  );
  const setAssessmentFormationDetails = useAssessmentFormationStore(
    (s) => s.setAssessmentFormationDetails,
  );
  const assessmentFormationSource = useAssessmentFormationStore(
    (s) => s.assessmentFormationSource,
  );

  const [selectedFormat, setSelectedFormat] = useState(
    assessmentFormationDetails?.allocation_type?.mode,
  ); // 'static' or 'randomized'
  const [isShuffleChecked, setIsShuffleChecked] = useState(
    assessmentFormationDetails?.allocation_type?.shuffle,
  );
  const [isActiveApiCall, setIsActiveApiCall] = useState(false);
  console.log(assessmentFormationDetails?.allocation_type)

  const router = useRouter();

  const handleCardClick = (format) => {
    setSelectedFormat(format);
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation(); // Prevent card click when toggling checkbox directly
    setSelectedFormat('static');
    setIsShuffleChecked(!isShuffleChecked);
  };

  const updateAssessmentFormation = async () => {
    try {
      let data = {
        allocation_mode: selectedFormat,
      };
      if (selectedFormat == 'static' && isShuffleChecked) {
        data = { ...data, shuffle: true };
      }

      const responseData = await updateAssessment(assessmentFormationId, data);
      return responseData;
    } catch (error) {
      console.log(error);
    }
  };

  const initiateQuestionGeneration = async () => {
    try {
      const data = {
        items: assessmentFormationDetails.items,
        assessment_config: {
          format_type: assessmentFormationDetails.allocation_type.mode,
          shuffle_per_candidate:
            assessmentFormationDetails.allocation_type?.shuffle || false,
        },
        questions_per_sub_competency: 3,
        project_details: {
          project_id: projectId,
        },
      };

      const responseData = await generateQuestions(data);
      return responseData;
    } catch (error) {
      console.error(error);
    }
  };

  const handleProceedClick = async () => {
    setIsActiveApiCall(true);
    try {
      const updateResponse = await updateAssessmentFormation();
      const response = await initiateQuestionGeneration();
      setAssessmentFormationDetails({
        ...assessmentFormationDetails,
        allocation_type: {
          ...assessmentFormationDetails.allocation_type,
          ...updateResponse.details.allocation_type,
        },
        job_id: response.job_id,
      });

      router.push(
        `/project/${projectId}/assessment/${assessmentFormationId}/questions`,
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleBookmarkClick = async () => {
    setIsActiveApiCall(true);
    try {
      const updateResponse = await updateAssessmentFormation();
      router.replace('/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleSendAssessmentToCandidates = async () => {
    console.debug("Clicked....")
    await handleBookmarkClick();
    router.push(`/project/${projectId}/assessment/${assessmentId}/access`);
  };

  const isProceedEnabled = selectedFormat !== null;

  // useEffect(() => {
  //   updateAssessmentFormation();
  // }, [selectedFormat, isShuffleChecked]);

  return (
    <div className={classes.container}>
      {/* Page Header */}
      <div className={classes.headerRow}>
        <div>
          <h1 className={classes.pageTitle}>Assessment Types</h1>
          <div className={classes.projectTagGroup}>
            <span className={classes.projectLabel}>Project:</span>
            <span className={classes.projectTag}>
              {projectName || 'Unknown Project'}
            </span>
          </div>
        </div>

        <div className={classes.actionGroup}>
          {assessmentFormationSource ===
            assessmentFormationSourceType.QUESTION_UPLOAD && (
            <button
              className={classes.bookmarkBtn}
              disabled={isActiveApiCall}
              onClick={handleBookmarkClick}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          )}
          {assessmentFormationSource ===
            assessmentFormationSourceType.QUESTION_UPLOAD && (
            <button
              className={`${classes.sendBtn} ${isProceedEnabled ? classes.sendBtnActive : ''}`}
              disabled={!isProceedEnabled || isActiveApiCall}
              onClick={ handleSendAssessmentToCandidates}
            >
              Send Assessment to Candidates
            </button>
          )}

          {assessmentFormationSource !==
            assessmentFormationSourceType.QUESTION_UPLOAD && (
            <button
              className={`${classes.proceedBtn} ${isProceedEnabled ? classes.sendBtnActive : ''}`}
              disabled={isActiveApiCall}
              onClick={handleProceedClick}
            >
              Proceed
            </button>
          )}
        </div>
      </div>

      <p className={classes.subtitle}>
        Select the assessment format type for this test
      </p>

      {/* Cards Container */}
      <div className={classes.cardsContainer}>
        {/* Static Card */}
        <div
          className={`${classes.formatCard} ${selectedFormat === 'static' ? classes.cardActive : ''}`}
          onClick={() => handleCardClick('static')}
        >
          <div className={classes.cardIcon}>
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3 className={classes.cardTitle}>Static</h3>
          <p className={classes.cardDescription}>
            Everyone sees the same fixed question set, frugal on AI
            question-generation costs, and it benchmarks every candidate against
            the same frame of reference.
          </p>

          <div className={classes.checkboxGroup} onClick={handleCheckboxChange}>
            <div
              className={`${classes.customCheckbox} ${isShuffleChecked ? classes.checkboxChecked : ''}`}
            >
              {isShuffleChecked && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <span className={classes.checkboxLabel}>
              Shuffle question order per candidate
            </span>
          </div>

          {isShuffleChecked && (
            <div className={classes.infoBox}>
              The ordering of the questions will be shuffled, so the nth
              question for one candidate will be different from the nth question
              of another.
            </div>
          )}
        </div>

        {/* Randomized Card */}
        <div
          className={`${classes.formatCard} ${selectedFormat === 'randomized' ? classes.cardActive : ''}`}
          onClick={() => handleCardClick('randomized')}
        >
          <div className={classes.cardIcon}>
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
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          </div>
          <h3 className={classes.cardTitle}>Randomized</h3>
          <p className={classes.cardDescription}>
            <strong>Anti-cheating safeguard:</strong> with (ⁿC₃)ᵏ possible
            combinations from randomized sub-skill questions, no two candidates
            see the same set, making pre-leaked answers effectively useless.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentMode;
