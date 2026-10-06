'use client';

import React, { useState, useEffect, useRef } from 'react';
import classes from './QuestionsStructure.module.css';
import competencyStructureIcon from '@/assets/assessment/competency-structure.svg';
import competenciesIcon from '@/assets/assessment/competencies.svg';
import subCompetenciesIcon from '@/assets/assessment/sub-competencies.svg';
import totalQuestionsIcon from '@/assets/assessment/total-questions.svg';
import minutesIcon from '@/assets/assessment/minutes.svg';
import regenerateIcon from '@/assets/assessment/regenerate.svg';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAssessmentFormationStore } from '@/store/assessmentFormationStore';
import { useProjectStore } from '@/store/projectStore';
import { updateAssessment } from '@/service/assessment.service';

const SERVER_URL_2 = process.env.NEXT_PUBLIC_QUESTION_GEN_API_SERVER_URL;

const fallbackQuestions = [
  {
    id: 1,
    question:
      'Under CGST Act, what is the time limit for filing GSTR-1 for a taxpayer with aggregate turnover exceeding ₹5 crore?',
    competency: 'GST Compliance',
    subCompetency: 'GST Registration & Filing',
    isSaved: false,
    regeneration_limit: 2,
    versions: [
      {
        version: 1,
        text: 'Under CGST Act, what is the time limit for filing GSTR-1 for a taxpayer with aggregate turnover exceeding ₹5 crore?',
        label: 'Version 1 — Original',
        raw: {
          options: [
            '10th of next month',
            '11th of next month',
            '20th of next month',
            '22nd of next month',
          ],
          correct_answer: '11th of next month',
        },
      },
    ],
  },
];

const QuestionsStructure = ({ projectId, assessmentId }) => {
  const projectName = useProjectStore((s) => s.currentProjectName);
  const fetchProjectDetails = useProjectStore((s) => s.fetchProjectDetails);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
  }, [projectId, fetchProjectDetails]);

  const assessmentFormationId = useAssessmentFormationStore(
    (s) => s.assessmentFormationId,
  );

  const assessmentFormationDetails = useAssessmentFormationStore(
    (s) => s.assessmentFormationDetails,
  );

  const router = useRouter();
  // const location = useLocation();

  const jobId = assessmentFormationDetails.job_id;
  const project = { project_id: projectId };

  const [questionsList, setQuestionsList] = useState(() => {
    const storedJobId = sessionStorage.getItem('currentJobId');
    if (jobId && storedJobId !== jobId) {
      sessionStorage.removeItem('questionsList');
      sessionStorage.setItem('currentJobId', jobId);
    } else {
      const stored = sessionStorage.getItem('questionsList');
      if (stored) return JSON.parse(stored);
    }
    return location.state?.questionsList || [];
  });

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [runningStep, setRunningStep] = useState(1);
  const [generationProgress, setGenerationProgress] = useState(
    questionsList.length > 0 ? 100 : 10,
  );
  const [isGenerationComplete, setIsGenerationComplete] = useState(
    questionsList.length > 0,
  );

  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [regenerateTargetRow, setRegenerateTargetRow] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [versionOptions, setVersionOptions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(1);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [isActiveApiCall, setIsActiveApiCall] = useState(false);

  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (questionsList.length > 0) {
      sessionStorage.setItem('questionsList', JSON.stringify(questionsList));
    }
  }, [questionsList]);

  useEffect(() => {
    if (questionsList.length > 0) {
      setIsGenerationComplete(true);
      setGenerationProgress(100);
      return;
    }

    if (!jobId) {
      setQuestionsList(fallbackQuestions);
      setIsGenerationComplete(true);
      return;
    }

    const es = new EventSource(
      `${SERVER_URL_2}/assessment/stream?job_id=${jobId}`,
    );
    eventSourceRef.current = es;

    es.addEventListener('progress', (evt) => {
      try {
        const data = JSON.parse(evt.data);
        console.log('[DEBUG]: ', data);
        if (data.step) setRunningStep(data.step);
        if (data?.progress_percentage) setGenerationProgress(data?.progress_percentage || 0);
      } catch (e) { }
    });

    es.addEventListener('node', () => {
      setRunningStep((prev) => Math.min(prev + 1, 5));
      // setGenerationProgress((prev) => Math.min(prev + 20, 90));
    });

    es.addEventListener('row', (evt) => {
      try {
        const row = JSON.parse(evt.data);
        setQuestionsList((prev) => {
          const exists = prev.some(
            (q) => q.id === row.id || q.row_number === row.row_number,
          );
          if (exists) return prev;

          const newRow = {
            id: row.id || prev.length + 1,
            row_number: row.row_number || prev.length + 1,
            question: row.question,
            competency: row.competency,
            subCompetency: row.sub_competency,
            level: row.level,
            question_type: row.question_type,
            scenario_title: row.scenario_title,
            business_scenario: row.business_scenario,
            code_snippet: row.code_snippet,
            options: row.options,
            correct_option: row.correct_option,
            correct_answer: row.correct_answer,
            correct_answer_explanation: row.correct_answer_explanation,
            isSaved: false,
            regeneration_limit:
              row.regeneration_limit !== undefined ? row.regeneration_limit : 2,
          };

          newRow.versions = [
            {
              version: 1,
              text: newRow.question,
              label: 'Version 1 — Original',
              raw: row,
            },
          ];

          return [...prev, newRow];
        });
      } catch (err) {
        console.error('Error parsing row data:', err);
      }
    });

    es.addEventListener('complete', () => {
      setGenerationProgress(100);
      setIsGenerationComplete(true);
      es.close();
    });

    es.addEventListener('failed', () => {
      setIsGenerationComplete(true);
      es.close();
    });

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [jobId]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const uniqueCompetencies = new Set(questionsList.map((q) => q.competency))
    .size;
  const uniqueSubCompetencies = new Set(
    questionsList.map((q) => q.subCompetency),
  ).size;
  const totalQuestions = questionsList.length;
  const estimatedDuration = totalQuestions;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = questionsList.slice(
    indexOfFirstRecord,
    indexOfLastRecord,
  );
  const totalPages = Math.max(
    Math.ceil(questionsList.length / recordsPerPage),
    1,
  );

  const stepLabels = [
    { id: 1, name: 'Question Mix', desc: 'Choosing scenario MCQ balance' },
    { id: 2, name: 'Decision Review', desc: 'Checking alignment parameters' },
    {
      id: 3,
      name: 'Business Scenarios',
      desc: 'Creating practical business contexts',
    },
    { id: 4, name: 'Scenario Validation', desc: 'Scoring domain relevance' },
    {
      id: 5,
      name: 'MCQ Creation',
      desc: 'Writing final options and explanations',
    },
  ];

  const handleOpenRegenerate = (row) => {
    if (row.regeneration_limit <= 0 || row.isSaved) return;

    setRegenerateTargetRow(row);
    setFeedbackText('');

    const currentVersions = row.versions || [
      {
        version: 1,
        text: row.question,
        label: 'Version 1 — Original',
        raw: row,
      },
    ];
    setVersionOptions(currentVersions);
    setSelectedVersion(currentVersions[currentVersions.length - 1].version);

    setIsRegenerateModalOpen(true);
  };

  const fetchRegeneratedOption = async (endpoint, payload, variationIndex) => {
    const response = await fetch(`${SERVER_URL_2}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, _variation: variationIndex }),
    });
    if (!response.ok) throw new Error('Regeneration failed');
    return response.json();
  };

  const handleTriggerRegeneration = async () => {
    if (!regenerateTargetRow) return;

    if (regenerateTargetRow.regeneration_limit <= 0) {
      alert(
        'You have reached the maximum regeneration quota (2 times) for this question.',
      );
      return;
    }

    setIsRegenerating(true);
    setIsRegenerateModalOpen(false);

    const target = regenerateTargetRow;
    const endpoint = feedbackText.trim()
      ? '/competency/re-generate-feedback'
      : '/competency/re-generate';

    const payload = {
      question_id: String(target.id),
      row_number: target.row_number || 1,
      competency: target.competency || '',
      sub_competency: target.subCompetency || '',
      level: target.level || 'Medium',
      question_type: target.question_type || 'scenario',
      scenario_title: target.scenario_title || '',
      business_scenario: target.business_scenario || '',
      code_snippet: target.code_snippet || '',
      current_question: target.question,
      current_options: target.options || [],
      current_correct_option: target.correct_option || 'A',
      current_correct_answer: target.correct_answer || '',
      current_correct_answer_explanation:
        target.correct_answer_explanation || '',
      feedback: feedbackText.trim(),
      regeneration_scope: 'single_question',
    };

    try {
      const nextVersionNum = (target.versions?.length || 1) + 1;
      const data = await fetchRegeneratedOption(
        endpoint,
        payload,
        nextVersionNum,
      );

      const newLimit = target.regeneration_limit - 1;
      const newVersion = {
        version: nextVersionNum,
        text: data.current_question || data.question,
        label: `Version ${nextVersionNum} — Regenerated`,
        raw: data,
      };

      const updatedVersions = [...(target.versions || []), newVersion];

      setQuestionsList((prev) =>
        prev.map((q) =>
          q.id === target.id
            ? { ...q, regeneration_limit: newLimit, versions: updatedVersions }
            : q,
        ),
      );
      setRegenerateTargetRow((prev) => ({
        ...prev,
        regeneration_limit: newLimit,
        versions: updatedVersions,
      }));

      setVersionOptions(updatedVersions);
      setSelectedVersion(nextVersionNum);
      setIsVersionModalOpen(true);
    } catch (err) {
      console.error('Regeneration error:', err);
      alert('Failed to regenerate questions. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const saveSingleQuestionToDB = async (question) => {
    try {
      const orgId = localStorage.getItem('organization_id');
      let userId = '';
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userId = userObj.user_id || userObj.userid || userObj.userId || '';
      }

      const payload = {
        question_text: question.question,
        option_1: question.options[0] || '',
        option_2: question.options[1] || '',
        option_3: question.options[2] || '',
        option_4: question.options[3] || '',
        correct_option_text:
          question.correct_answer || question.correct_option || '',
        competency_name: question.competency,
        subcompetency_name: question.subCompetency,
        code_snippet: question.code_snippet || '',
        marks: 1,
        question_type: question.question_type || 'scenario',
        level: question.level || 'Medium',
        scenario_title: question.scenario_title || '',
        business_scenario: question.business_scenario || '',
        correct_answer_explanation: question.correct_answer_explanation || '',
        organization_id: orgId,
        created_by: userId,
      };

      await fetch(`${SERVER_URL}/questions/mcq/single-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('Question safely saved to database.');
    } catch (err) {
      console.error('Failed to save single question to DB:', err);
    }
  };

  const handleProceedWithSelection = async () => {
    setIsVersionModalOpen(false);
    const chosen = versionOptions.find((v) => v.version === selectedVersion);

    const targetRow = questionsList.find(
      (q) => q.id === regenerateTargetRow?.id,
    );
    if (!chosen || !targetRow) return;

    const isExhausted = targetRow.regeneration_limit <= 0;

    const updatedQ = {
      ...targetRow,
      question: chosen.text,
      options:
        chosen.raw?.current_options || chosen.raw?.options || targetRow.options,
      correct_answer:
        chosen.raw?.current_correct_answer ||
        chosen.raw?.correct_answer ||
        targetRow.correct_answer,
      isSaved: isExhausted || targetRow.isSaved,
    };

    setQuestionsList((prev) =>
      prev.map((q) => (q.id === targetRow.id ? updatedQ : q)),
    );

    if (isExhausted) {
      await saveSingleQuestionToDB(updatedQ);
    }
  };

  const submitToWorkflow = async () => {
    setIsSubmitting(true);
    try {
      const orgId = localStorage.getItem('organization_id');
      let userId = '';
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userId = userObj.user_id || userObj.userid || userObj.userId || '';
      }
      const flowData = location.state?.curatedFlowData || {};
      const flowId =
        flowData.curate_flow_id || flowData.id || location.state?.flowId;
      const projectId = project?.id || project?.project_id || '';
      const nodeId =
        location.state?.nodeId || location.state?.curate_flow_node_id;

      if (!orgId || !userId || !flowId || !nodeId)
        throw new Error('Missing credentials');

      const roleToPriority = {
        must: 'Must Have',
        good: 'Good to Have',
        icing: 'Icing on Cake',
      };
      const selectedCompItems = location.state?.selectedCompetencies || [];
      const compMap = {};

      selectedCompItems.forEach((item) => {
        if (!compMap[item.competency]) {
          compMap[item.competency] = {
            competency_name: item.competency,
            competency_description: item.competency_definition || '',
            subcompetencies: [],
          };
        }
        if (
          !compMap[item.competency].subcompetencies.find(
            (s) => s.subcompetency_name === item.sub_competency,
          )
        ) {
          compMap[item.competency].subcompetencies.push({
            subcompetency_name: item.sub_competency,
            subcompetency_description: item.sub_competency_definition || '',
            priority: roleToPriority[item.priority] || 'Must Have',
            add_to_test: true,
          });
        }
      });

      const formattedQuestions = questionsList.map((q) => {
        const options = q.options || [];
        return {
          question_text: q.question,
          option_1: options[0] || '',
          option_2: options[1] || '',
          option_3: options[2] || '',
          option_4: options[3] || '',
          correct_option_text: q.correct_answer || q.correct_option || '',
          competency_name: q.competency,
          subcompetency_name: q.subCompetency,
          code_snippet: q.code_snippet || '',
          marks: 1,
          question_type: q.question_type || 'scenario',
          scenario_title: q.scenario_title || '',
          business_scenario: q.business_scenario || '',
          correct_answer_explanation: q.correct_answer_explanation || '',
          level: q.level || 'Medium',
        };
      });

      const unifiedPayload = {
        assessment_formation_name: project?.name || 'Generated Questions',
        organization_id: orgId,
        created_by: userId,
        project_id: projectId,
        curate_flow_node_id: nodeId,
        job_id: jobId,
        total_competencies: uniqueCompetencies,
        total_subcompetencies: uniqueSubCompetencies,
        total_questions: totalQuestions,
        estimated_duration_minutes: estimatedDuration,
        competencies: Object.values(compMap),
        questions: formattedQuestions,
      };

      const postResponse = await fetch(
        `${SERVER_URL}/assessments/formation/ai-generated`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(unifiedPayload),
        },
      );

      if (!postResponse.ok)
        throw new Error('Failed to save assessment formation into database.');

      const updateFlowPayload = {
        curated_flow_details: {
          ...(flowData.curated_flow_details || {}),
          node2: {
            ...(flowData.curated_flow_details?.node2 || {}),
            assessment_stats: {
              total_competencies: uniqueCompetencies,
              total_subcompetencies: uniqueSubCompetencies,
              total_questions: totalQuestions,
              estimated_duration_minutes: estimatedDuration,
            },
          },
        },
      };

      const putResponse = await fetch(`${SERVER_URL}/curated-flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateFlowPayload),
      });

      if (!putResponse.ok)
        throw new Error('Failed to update curated flow entry.');
      setIsSuccessModalOpen(true);
    } catch (error) {
      alert(`Process failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToWorkflow = () => {
    const flowId =
      new URLSearchParams(location.search).get('flow_id') ||
      location.state?.flowId;
    router.push(
      flowId
        ? `/projects/curate-flow?flow_id=${flowId}`
        : '/projects/curate-flow',
      {
        state: {
          ...location.state,
          flowId: flowId,
          qBankSelected: true,
          flowSaved: true,
        },
      },
    );
  };

  function groupQuestionsByCompetency(data, questions) {
    // Create a lookup map
    const questionMap = questions.reduce((map, question) => {
      const key = `${question.question_details.competency}||${question.question_details.subCompetency}`;

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(question);
      return map;
    }, {});

    console.log(questionMap);

    // Attach questions to each competency object
    return data.map((item) => {
      const key = `${item.competency}||${item.sub_competency}`;

      return {
        ...item,
        questions: questionMap[key] || [],
      };
    });
  }

  function formatQuestion(question) {
    const {
      question: questionText,
      options = [],
      correct_answer,
      code_snippet,
      ...questionDetails
    } = question;

    return {
      question_text: questionText,

      // Convert options array -> option_1, option_2, ...
      ...Object.fromEntries(
        options.map((option, index) => [`option_${index + 1}`, option]),
      ),

      correct_option_text: correct_answer,
      code_snippets: code_snippet,
      hints_text: null,
      marks: 1,
      source: 'ai-generated',

      // Everything else
      question_details: questionDetails,
    };
  }

  const updateAssessmentFormation = async () => {
    try {
      const formattedQuestionsList = questionsList.map((question) =>
        formatQuestion(question),
      );
      console.log('FOrmatted: ', formattedQuestionsList);
      const finalItems = groupQuestionsByCompetency(
        assessmentFormationDetails?.items,
        formattedQuestionsList,
      );

      const data = {
        items: finalItems,
      };

      const responseData = await updateAssessment(assessmentFormationId, data);
      return responseData;
    } catch (error) {
      console.log(error);
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
    await handleBookmarkClick();
    router.push(`/project/${projectId}/assessment/${assessmentId}/access`);
  };

  const isProceedEnabled = isGenerationComplete && !isActiveApiCall;

  return (
    <div className={classes['questions-page']}>
      <header className={classes['header']}>
        <div>
          <div className={classes['page-title']}>
            <p>Questions</p>
            <span className={classes['highlight']}>Structure</span>
            <Image src={competencyStructureIcon} alt="" />
          </div>
          <div className={classes['meta-bar']}>
            <span className={classes['meta-label']}>Project:</span>
            <span className={classes['meta-value']}>
              {projectName || 'Unknown Project'}
            </span>
          </div>
        </div>
        {/* <div className={classes["action-buttons-wrapper"]}>
          <button
            className={classes["btn-view-detail"]}
            onClick={() =>
              router.push("/assessment/mcq-questions-detail", {
                state: { ...location.state, questionsList: questionsList, returnPath: location.pathname },
              })
            }
          >
            View All Detail Questions
          </button>
          <button className={classes["btn-add-workflow"]} onClick={submitToWorkflow} disabled={isSubmitting || !isGenerationComplete}>
            {isSubmitting ? "Saving..." : "Add To Workflow"}
          </button>
        </div>*/}

        <div className={classes.actionGroup}>
          <button
            className={classes.bookmarkBtn}
            disabled={!isProceedEnabled}
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

          <button
            className={`${classes.sendBtn} ${isProceedEnabled ? classes.sendBtnActive : ''}`}
            disabled={!isProceedEnabled}
            onClick={handleSendAssessmentToCandidates}
          >
            Send Assessment to Candidates
          </button>

          {/* <button
              className={`${classes.proceedBtn}`}
              // disabled={isActiveApiCall}
              onClick={handleProceedClick}
            >
              Proceed
            </button>*/}
        </div>
      </header>

      {/* Metrics Header */}
      <div className={classes['metrics-grid']}>
        <div className={classes['metric-card']}>
          <div className={classes['metric-icon']}>
            <Image src={competenciesIcon} alt="" />
          </div>
          <div>
            <span className={classes['metric-num']}>{uniqueCompetencies}</span>
            <span className={classes['metric-label']}>
              competencies
              <br />
              <small>Auto-calculated</small>
            </span>
          </div>
        </div>
        <div className={classes['metric-card']}>
          <div className={classes['metric-icon']}>
            <Image src={subCompetenciesIcon} alt="" />
          </div>
          <div>
            <span className={classes['metric-num']}>
              {uniqueSubCompetencies}
            </span>
            <span className={classes['metric-label']}>
              Sub-competencies
              <br />
              <small>Auto-calculated</small>
            </span>
          </div>
        </div>
        <div className={classes['metric-card']}>
          <div className={classes['metric-icon']}>
            <Image src={totalQuestionsIcon} alt="" />
          </div>
          <div>
            <span className={classes['metric-num']}>{totalQuestions}</span>
            <span className={classes['metric-label']}>
              Total Questions
              <br />
              <small>Auto-calculated</small>
            </span>
          </div>
        </div>
        <div className={classes['metric-card']}>
          <div className={classes['metric-icon']}>
            <Image src={minutesIcon} alt="" />
          </div>
          <div>
            <span className={classes['metric-num']}>
              {estimatedDuration}{' '}
              <span className={classes['min-text']}>Minutes</span>
            </span>
            <span className={classes['metric-label']}>
              Estimated Duration
              <br />
              <small>Auto-calculated</small>
            </span>
          </div>
        </div>
      </div>

      {!isGenerationComplete && (
        <div className={classes['engine-card-container']}>
          <div className={classes['progress-bar-top']}>
            <p>Generating Questions from Graph Agent Workflow...</p>
            <p className={classes['engine-progress-text']}>
              {generationProgress}%
            </p>
          </div>
          <div className={classes['engine-progress-bar-track']}>
            <div
              className={classes['engine-progress-fill']}
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
          <div className={classes['engine-layout-box']}>
            <div className={classes['engine-monitor-screen']}>
              <span className={classes['running-badge']}>NOW RUNNING</span>
              <h3 className={classes['running-status-header']}>
                Generating domain questions...
              </h3>
              <p className={classes['running-sub-logs']}>
                Formulating options and scoring logic per sub-competency.
              </p>
            </div>
            <div className={classes['engine-steps-list']}>
              {stepLabels.map((step) => (
                <div
                  key={step.id}
                  className={`${classes['step-row']} ${runningStep === step.id ? classes['step-active'] : runningStep > step.id ? classes['step-passed'] : ''}`}
                >
                  <div className={classes['step-circle-indicator']}>
                    {runningStep > step.id ? '✓' : step.id}
                  </div>
                  <div>
                    <h4 className={classes['step-title-text']}>{step.name}</h4>
                    <p className={classes['step-desc-text']}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div className={classes['table-wrapper']}>
        <table className={classes['questions-table']}>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th style={{ width: '60%' }}>QUESTIONS</th>
              <th>COMPETENCY</th>
              <th>SUB-COMPETENCY</th>
              <th className={classes['center-col']}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((row, idx) => (
              <tr key={row.id || idx}>
                <td className={classes['id-col']}>
                  {indexOfFirstRecord + idx + 1}
                </td>
                <td className={classes['question-text-cell']}>
                  <div className={classes['question-content-layout']}>
                    <span>{row.question}</span>
                    {row.isSaved && (
                      <span className={classes['badge-saved-green']}>
                        Saved
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={classes['comp-badge']}>
                    {row.competency}
                  </span>
                </td>
                <td className={classes['sub-comp-text']}>
                  {row.subCompetency}
                </td>
                <td className={classes['center-col']}>
                  <button
                    className={classes['btn-refresh-row']}
                    title="Regenerate this question"
                    onClick={() => handleOpenRegenerate(row)}
                    disabled={
                      isRegenerating ||
                      row.isSaved ||
                      row.regeneration_limit <= 0
                    }
                    style={{
                      opacity:
                        row.isSaved || row.regeneration_limit <= 0 ? 0.5 : 1,
                    }}
                  >
                    <Image src={regenerateIcon} alt="Regenerate" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className={classes['table-pagination-footer']}>
          <span className={classes['total-count-lbl']}>
            Total {questionsList.length} Questions
          </span>
          <div className={classes['pagination-pages-track']}>
            <span className={classes['page-static-lbl']}>Page</span>
            {Array.from({ length: totalPages }, (_, idx) => (
              <button
                key={idx + 1}
                className={`${classes['page-num-trigger']} ${currentPage === idx + 1 ? classes['page-active'] : ''}`}
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className={classes['pagination-nav-actions']}>
            <button
              className={classes['btn-prev']}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              &lt; Previous
            </button>
            <button
              className={classes['btn-next']}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next &gt;
            </button>
          </div>
        </footer>
      </div>

      {/* Regenerate Modal */}
      {isRegenerateModalOpen && (
        <div className={classes['modal-overlay']}>
          <div className={classes['modal-content-regenerate']}>
            <div className={classes['modal-header']}>
              <h2 className={classes['modal-title']}>
                What would you like to change about the question?
              </h2>
              <button
                className={classes['btn-close']}
                onClick={() => setIsRegenerateModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={classes['modal-body']}>
              <div className={classes['textarea-container']}>
                <textarea
                  className={classes['feedback-textarea']}
                  placeholder="Enter instructions or changes..."
                  rows="5"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                ></textarea>
                <div className={classes['textarea-actions']}>
                  <button
                    className={`${classes['btn-submit-regenerate']} ${feedbackText.trim().length >= 3 ? classes['btn-submit-active'] : ''}`}
                    disabled={feedbackText.trim().length < 3}
                    onClick={handleTriggerRegeneration}
                  >
                    Submit & Regenerate
                  </button>
                </div>
              </div>
              <div className={classes['divider-container']}>
                <span className={classes['divider-text']}>Or</span>
              </div>
              <div className={classes['auto-regenerate-section']}>
                <p className={classes['auto-regenerate-text']}>
                  Auto-generate a new version based on current scenario
                </p>
                <button
                  className={classes['btn-auto-regenerate']}
                  onClick={handleTriggerRegeneration}
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version Selection Modal */}
      {isVersionModalOpen && (
        <div className={classes['modal-overlay']}>
          <div className={classes['modal-content-version']}>
            <div
              className={classes['version-modal-header']}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <h2 className={classes['version-modal-title']}>
                  Select a version of the questions to proceed with.
                </h2>
                <p className={classes['version-modal-subtitle']}>
                  Make sure you select the version you prefer, this action
                  cannot be undone
                </p>
              </div>

              {regenerateTargetRow?.regeneration_limit > 0 && (
                <button
                  className={classes['btn-modal-regenerate']}
                  onClick={() => {
                    setIsVersionModalOpen(false);
                    setFeedbackText('');
                    setIsRegenerateModalOpen(true);
                  }}
                  disabled={isRegenerating}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    src={regenerateIcon}
                    alt="Regenerate"
                    style={{ opacity: isRegenerating ? 0.5 : 1 }}
                  />
                </button>
              )}
            </div>
            <div
              className={classes['version-split-container']}
              style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                padding: '10px 0',
              }}
            >
              {versionOptions.map((v) => (
                <div
                  key={v.version}
                  className={`${classes['version-card']} ${selectedVersion === v.version ? classes['version-selected-card'] : ''}`}
                  onClick={() => setSelectedVersion(v.version)}
                  style={{ flex: '1', minWidth: '250px', cursor: 'pointer' }}
                >
                  <p className={classes['version-card-text']}>{v.text}</p>
                  <div className={classes['version-badge-row']}>
                    <span className={classes['version-label-meta']}>
                      {v.label}
                    </span>
                    {selectedVersion === v.version ? (
                      <span className={classes['badge-selected-filled']}>
                        Selected
                      </span>
                    ) : (
                      <button className={classes['btn-select-pill']}>
                        Select
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={classes['version-footer-actions']}>
              <button
                className={classes['btn-proceed-selection']}
                onClick={handleProceedWithSelection}
              >
                Proceed With Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className={classes['modal-overlay']}>
          <div className={classes['modal-content-success']}>
            <div className={classes['success-icon-large']}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 6L9 17L4 12"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className={classes['success-title']}>
              Successfully added to workflow!
            </h2>
            <p className={classes['success-subtitle']}>
              {uniqueCompetencies} - Competency | {uniqueSubCompetencies} - Sub
              Competencies | {totalQuestions} - Questions | {estimatedDuration}{' '}
              - Minutes
            </p>
            <button
              className={classes['btn-back-workflow']}
              onClick={handleBackToWorkflow}
            >
              Back to Workflow
            </button>
          </div>
        </div>
      )}

      {/* Global Loading State */}
      {isRegenerating && (
        <div
          className={classes['modal-overlay']}
          style={{
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              border: '6px solid rgba(255, 255, 255, 0.3)',
              borderTop: '6px solid #D4AF37',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2
            style={{
              color: '#FFFFFF',
              marginTop: '24px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '24px',
              fontWeight: '600',
            }}
          >
            Regenerating Questions...
          </h2>
          <p
            style={{
              color: '#E0E0E0',
              marginTop: '8px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '16px',
            }}
          >
            Please wait while the AI formulates new options.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestionsStructure;
