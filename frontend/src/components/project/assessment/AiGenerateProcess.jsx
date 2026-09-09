'use client';

import React, { useState, useEffect, useRef } from 'react';
import classes from './AiGenerateProcess.module.css';
import generatingCompetenciesIcon from '@/assets/assessment/generating-competencies.svg';
import pauseIcon from '@/assets/assessment/pause-icon.svg';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  assessmentFormationSourceType,
  useAssessmentFormationStore,
} from '@/store/assessmentFormationStore';
import { useProjectStore } from '@/store/projectStore';
import { generateCompetency } from '@/service/assessment.service';

const SERVER_URL_2 = process.env.NEXT_PUBLIC_QUESTION_GEN_API_SERVER_URL;

const STEPS_DATA = [
  { 
    id: 'extract_jd_competencies', 
    title: 'JD Reading', 
    descPending: 'Waiting to read JD', 
    descActive: 'Reading Job Description', 
    descDone: 'Completed',
    runningTitle: 'Analyzing Job Description'
  },
  { 
    id: 'select_current_jd_competency', 
    title: 'Select Competency', 
    descPending: 'Selecting competencies', 
    descActive: 'In progress right now', 
    descDone: 'Completed',
    runningTitle: 'Reading competency context'
  },
  { 
    id: 'generate_jd_competency_combinations', 
    title: 'Sub-competencies', 
    descPending: 'Creating measurable sub-competencies', 
    descActive: 'Generating sub-competencies', 
    descDone: 'Completed',
    runningTitle: 'Generating measurable sub-competencies'
  },
  { 
    id: 'verify_jd_competency_compatibility', 
    title: 'Compatibility', 
    descPending: 'Scoring alignment with the JD', 
    descActive: 'Calculating alignment scores', 
    descDone: 'Completed',
    runningTitle: 'Scoring alignment with the JD'
  },
  { 
    id: 'accept_jd_competency_combination', 
    title: 'Accept Bundle', 
    descPending: 'Adding the best bundle to the list', 
    descActive: 'Processing bundles', 
    descDone: 'Completed',
    runningTitle: 'Adding the best bundle to the list'
  },
  { 
    id: 'select_top_jd_competency_items', 
    title: 'Final Rows', 
    descPending: 'Selecting the final competency table rows', 
    descActive: 'Finalizing rows', 
    descDone: 'Completed',
    runningTitle: 'Selecting the final competency table rows'
  }
];

const AiGenerateProcess = ({ projectId }) => {
  const projectName = useProjectStore((s) => s.currentProjectName);
  const setAssessmentFormationDetails = useAssessmentFormationStore(
    (state) => state.setAssessmentFormationDetails,
  );

  const router = useRouter();
  // const location = useLocation();

  const [progress, setProgress] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const eventSourceRef = useRef(null);
  const pendingJobRef = useRef(null);

  const activeStepIndex = isComplete
    ? STEPS_DATA.length
    : STEPS_DATA.findIndex((s) => s.id === progress.node);
  const isFinished = isComplete;
  const progressPct = progress.progress_percentage ?? 0;

  // const project = location.state?.project || JSON.parse(localStorage.getItem("current_curation_project") || "{}");
  // const projectId = project?.id || project?.project_id || "1";

  useEffect(() => {
    console.log('ProjectId: ', projectId);
    let isMounted = true;

    const initiateCompetencyGeneration = async () => {
      try {
        if (
          !pendingJobRef.current ||
          pendingJobRef.current.projectId !== projectId
        ) {
          const promise = generateCompetency(projectId).finally(() => {
            if (pendingJobRef.current?.projectId === projectId) {
              pendingJobRef.current = null;
            }
          });
          pendingJobRef.current = { projectId, promise };
        }

        const data = await pendingJobRef.current.promise;

        if (!isMounted) return;

        const jobId = data.job_id;

        if (!jobId) {
          throw new Error('Job ID missing from server response.');
        }

        eventSourceRef.current?.close();

        const es = new EventSource(
          `${SERVER_URL_2}/competency/jd/stream?job_id=${jobId}`,
        );
        eventSourceRef.current = es;

        es.onmessage = (event) => {};

        es.addEventListener('started', () => {
          if (!isMounted) return;
        });

        es.addEventListener('progress', (evt) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(evt.data);
            setProgress(parsed);
          } catch (e) {
            // ignore parse errors
          }
        });

        es.addEventListener('node', () => {
          if (!isMounted) return;
          // setTask1Status('Completed');
          // setTask2Status('Working');
          // setProgress(80);
        });

        es.addEventListener('complete', (evt) => {
          if (!isMounted) return;
          setIsComplete(true);
          setProgress((prev) => ({ ...prev, progress_percentage: 100 }));

          let items = [];
          try {
            const payload = JSON.parse(evt.data);
            items = payload.items || payload.competencies || payload.data || [];
            setAssessmentFormationDetails((prev) => ({
              ...prev,
              items: items.map((item) => ({
                ...item,
                add_to_test: true,
                priority: 'must have',
              })),
              source: assessmentFormationSourceType.AI_GENERATE,
            }));
          } catch (err) {
            console.error(
              'Error parsing competency complete event payload',
              err,
            );
          }

          es.close();

          setTimeout(() => {
            router.replace(
              `/project/${projectId}/assessment/review-competency`,
              // {
              // state: {
              //     ...location.state,
              //     project,
              //     competencyItems: items
              // },
              // replace: true
              // }
            );
          }, 800);
        });

        es.addEventListener('failed', (evt) => {
          if (!isMounted) return;
          es.close();
          setErrorMsg('Competency generation failed. Redirecting...');
          setTimeout(() => router.back(), 3000);
        });

        es.onerror = () => {
          if (es.readyState === EventSource.CLOSED) return;
          es.close();
        };
      } catch (err) {
        console.error('Competency generation initiation error:', err);
        if (isMounted) {
          setErrorMsg('Unable to connect to generation service.');
          // setTimeout(() => {
          //   router.push('/');
          // }, 2500);
        }
      }
    };

    initiateCompetencyGeneration();

    return () => {
      isMounted = false;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [projectId]);

  return (
    <div className={classes.pageContainer}>
      <div className={classes.mainCard}>
        
        {/* --- Header Section --- */}
        <div className={classes.headerSection}>
          <div className={classes.headerContent}>
            <span className={classes.overline}>GENERATING {progress.item_index ?? 0} OF {progress.total_items ?? 0}</span>
            <h1 className={classes.title}>{progress.competency || 'Generating Competency...'}</h1>
            <p className={classes.description}>
              {progress.message || 'Starting competency generation...'}
            </p>
          </div>
          
          <div className={classes.headerStats}>
            <div className={classes.statBoxes}>
              <div className={classes.statBox}>
                <span className={classes.statValue}>{progress.item_index ?? 0}/{progress.total_items ?? 0}</span>
                <span className={classes.statLabel}>Competencies</span>
              </div>
              <div className={classes.statBox}>
                <span className={classes.statValue}>{progress.rows_ready ?? 0}</span>
                <span className={classes.statLabel}>Rows ready</span>
              </div>
            </div>
            {/* <button className={classes.stopBtn}>Stop Generation</button>*/}
          </div>
        </div>

        {/* --- Progress Bar Section --- */}
        <div className={classes.progressSection}>
          <div className={classes.progressHeader}>
            <span className={classes.progressLabel}>{progress.competency || 'Generating...'}</span>
            <span className={classes.progressPctText}>{progressPct}%</span>
          </div>
          <div className={classes.progressBarTrack}>
            <div 
              className={classes.progressBarFill} 
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>

        {/* --- Main Content Section --- */}
        <div className={classes.contentLayout}>
          
          {/* Left Card: Now Running */}
          <div className={classes.nowRunningCard}>
            <span className={classes.nowRunningOverline}>NOW RUNNING</span>
            
            <div className={classes.runningTitleRow}>
              <h2 className={classes.runningTitle}>
                {isFinished ? "Generation Complete" : (progress.message || 'Starting...')}
              </h2>
              {!isFinished && (
                <div className={classes.loadingDots}>
                  <span className={classes.dotGreen}></span>
                  <span className={classes.dotBlue}></span>
                  <span className={classes.dotGold}></span>
                </div>
              )}
            </div>

            <p className={classes.runningDesc}>
              {progress.competency || 'Waiting for competency data...'}
            </p>
          </div>

          {/* Right Section: Stepper Timeline */}
          <div className={classes.stepperContainer}>
            {STEPS_DATA.map((step, index) => {
              const isCompleted = activeStepIndex >= 0 && index < activeStepIndex;
              const isActive = activeStepIndex >= 0 && index === activeStepIndex;
              const isPending = activeStepIndex < 0 || index > activeStepIndex;
              const isLast = index === STEPS_DATA.length - 1;

              return (
                <div key={step.id} className={classes.stepRow}>
                  
                  {/* Indicator Column */}
                  <div className={classes.stepIndicatorCol}>
                    {/* Circle */}
                    <div className={`
                      ${classes.stepCircle} 
                      ${isCompleted ? classes.circleCompleted : ''} 
                      ${isActive ? classes.circleActive : ''} 
                      ${isPending ? classes.circlePending : ''}
                    `}>
                      {isCompleted && "OK"}
                      {isActive && ">"}
                      {isPending && index+1}
                    </div>
                    
                    {/* Connecting Line */}
                    {!isLast && (
                      <div className={`
                        ${classes.stepLine} 
                        ${isCompleted ? classes.lineCompleted : classes.linePending}
                      `}></div>
                    )}
                  </div>

                  {/* Text Card Column */}
                  <div className={`
                    ${classes.stepCard} 
                    ${isActive ? classes.stepCardActive : ''}
                  `}>
                    <h4 className={classes.stepTitle}>{step.title}</h4>
                    <p className={classes.stepSubtitle}>
                      {isCompleted && step.descDone}
                      {isActive && step.descActive}
                      {isPending && step.descPending}
                    </p>
                  </div>
                  
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};

export default AiGenerateProcess;
