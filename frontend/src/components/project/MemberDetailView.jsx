'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './MemberDetailView.module.css';
import ShifuSkillGapAnalysis from '@/components/assessment-attempt/SkillGapAnalysis';
import { getExamResult } from '@/service/assessmentAttempt.service';

// --- Helper to format ISO submission timestamps cleanly ---
const formatSubmissionTime = (ts) => {
  if (!ts) return null;
  try {
    if (typeof ts === 'string') {
      const clean = ts.split('.')[0].replace('T', ' ');
      return clean;
    }
    return String(ts);
  } catch (e) {
    return String(ts);
  }
};

// --- Helper to strip leading numbers from chapter/module names ---
const cleanTitle = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/^\d+[\.\s\-]+/, '').trim();
};

// --- Lock Icon SVG for Locked/Coming Soon Features ---
const LockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.75 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// --- Gauge SVG Component (Matching Figma & SkillGapAnalysis specs) ---
const GaugeSVG = ({ score = 70 }) => {
  const W = 680, H = 340;
  const CX = 340, CY = 285;
  const R_OUTER = 165;
  const R_INNER = 138;
  const NUM_TICKS = 100;

  const tickAngle = (i) => Math.PI - (i / NUM_TICKS) * Math.PI;
  const pt = (anglRad, r) => ({
    x: CX + r * Math.cos(anglRad),
    y: CY - r * Math.sin(anglRad),
  });

  const tickColor = (pct) => {
    if (pct < 20) return '#e74c3c';
    if (pct < 40) return '#e67e22';
    if (pct < 55) return '#f1c40f';
    if (pct < 75) return '#84bd32';
    return '#27ae60';
  };

  const currentColor = tickColor(score);
  const ticks = [];
  for (let i = 0; i <= NUM_TICKS; i++) {
    const pct = (i / NUM_TICKS) * 100;
    const ang = tickAngle(i);
    const filled = pct <= score;
    const isMajor = i % 10 === 0;

    const p1 = pt(ang, R_INNER);
    const p2 = pt(ang, isMajor ? R_OUTER + 5 : R_OUTER);

    ticks.push(
      <line
        key={i}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={filled ? tickColor(pct) : '#EAE8E1'}
        strokeWidth={isMajor ? 2.5 : 1.5}
        strokeLinecap="round"
      />
    );
  }

  const needleAng = tickAngle(score);
  const pointerTip = pt(needleAng, R_INNER - 2);
  const pointerBaseCenter = pt(needleAng, R_INNER - 18);
  const perpAng = needleAng + Math.PI / 2;
  const base1 = {
    x: pointerBaseCenter.x + 8 * Math.cos(perpAng),
    y: pointerBaseCenter.y - 8 * Math.sin(perpAng),
  };
  const base2 = {
    x: pointerBaseCenter.x - 8 * Math.cos(perpAng),
    y: pointerBaseCenter.y + 8 * Math.sin(perpAng),
  };

  const scaleNums = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const tiers = [
    { label: 'Seeker', pct: 0, anchor: 'end', dx: -10, dy: 4 },
    { label: 'Proficient', pct: 26, anchor: 'end', dx: -12, dy: -8 },
    { label: 'Achiever', pct: 50, anchor: 'middle', dx: 0, dy: -14 },
    { label: 'Master', pct: 74, anchor: 'start', dx: 12, dy: -8 },
    { label: 'Champion', pct: 100, anchor: 'start', dx: 10, dy: 4 },
  ];

  return (
    <div className={styles.gaugeWrapper}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.gaugeSvg}>
        <path
          d={`M ${pt(Math.PI, R_INNER - 2).x},${pt(Math.PI, R_INNER - 2).y} A ${R_INNER - 2},${R_INNER - 2} 0 0 1 ${pt(0, R_INNER - 2).x},${pt(0, R_INNER - 2).y}`}
          fill="none"
          stroke="#F7F5F0"
          strokeWidth={R_OUTER - R_INNER + 4}
        />
        {ticks}
        <polygon
          points={`${pointerTip.x},${pointerTip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
          fill={currentColor}
        />
        {scaleNums.map((val) => {
          const pos = pt(tickAngle(val), R_OUTER + 16);
          return (
            <text key={val} x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="12" fill="#7A8099" fontFamily="DM Sans" fontWeight="600">
              {val}
            </text>
          );
        })}
        {tiers.map(({ label, pct, anchor, dx, dy }) => {
          const pos = pt(tickAngle(pct), R_OUTER + 40);
          return (
            <text key={label} x={pos.x + dx} y={pos.y + dy} textAnchor={anchor} fontSize="16" fill="#1A1C23" fontFamily="DM Sans" fontWeight="600">
              {label}
            </text>
          );
        })}
        <text x={CX} y={CY - 35} textAnchor="middle" fontSize="38" fontWeight="700" fill="#1A1C23" fontFamily="DM Sans">
          {score}%
        </text>
        <text x={CX} y={CY - 12} textAnchor="middle" fontSize="13" fontWeight="500" fill="#7A8099" fontFamily="DM Sans">
          Score
        </text>
      </svg>
    </div>
  );
};

const MemberDetailView = ({ member, projectData, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'skill_gap' | 'roadmap' | 'quizzes' | 'capstone'
  const [comments, setComments] = useState(member?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [expandedModules, setExpandedModules] = useState({ 3: true });
  const [examResultData, setExamResultData] = useState(null);
  const [quizSearch, setQuizSearch] = useState('');
  const [reviewingQuiz, setReviewingQuiz] = useState(null);

  const defaultQuizList = [
    { id: 1, title: 'Crack It - 1.1', score: 100, correctText: '5/5 correct' },
    { id: 2, title: 'Crack It - 1.2', score: 100, correctText: '5/5 correct' },
    { id: 3, title: 'Crack It - 2.1', score: 100, correctText: '12/12 correct' },
    { id: 4, title: 'Crack It - 2.2', score: 100, correctText: '8/8 correct' },
    { id: 5, title: 'Crack It - 2.3', score: 50, correctText: '2/5 correct' },
    { id: 6, title: 'Smash It - 1.1', score: 100, correctText: '12/12 correct' },
    { id: 7, title: 'Smash It - 1.2', score: 100, correctText: '5/5 correct' },
    { id: 8, title: 'Smash It - 2.1', score: 38, correctText: '3/8 correct' },
    { id: 9, title: 'Smash It - 2.2', score: 92, correctText: '11/12 correct' },
    { id: 10, title: 'Milestone Quiz', score: 85, correctText: '17/20 correct' },
  ];

  const projectType = (projectData?.project_details?.project_type || projectData?.project_type || '').toLowerCase();
  const isSkillGapOnly = projectType === 'skill_gap_assessment';
  const isRoadmapOnly = projectType === 'roadmap';
  const isBoth = !isSkillGapOnly && !isRoadmapOnly;

  // Derive skill-gap specific allocation ID from user_quizzes (assessment_type === 'skill_gap_assessment')
  const skillGapQuiz = member?.user_quizzes?.find(
    q => q.assessment_type === 'skill_gap_assessment' && (q.status === 'Completed' || q.score !== null || q.score !== undefined || q.submission_time)
  );
  const isSkillGapCompleted = Boolean(
    skillGapQuiz?.status === 'Completed' || 
    (skillGapQuiz?.score !== null && skillGapQuiz?.score !== undefined) || 
    (member?.assessmentStatus || '').toLowerCase() === 'completed'
  );
  const skillGapAllocationId = (skillGapQuiz?.allocation_id || null);

  // Generic (most recent) allocation — only use if assessment is completed
  const effectiveAllocationId = (member?.allocationId || member?.allocation_id || member?.assignment_id || member?.access_id);

  useEffect(() => {
    if (skillGapAllocationId) {
      getExamResult(skillGapAllocationId)
        .then((data) => setExamResultData(data))
        .catch((err) => console.log('Could not fetch skill gap exam result:', err));
    } else if (effectiveAllocationId) {
      getExamResult(effectiveAllocationId)
        .then((data) => setExamResultData(data))
        .catch((err) => console.log('Could not fetch exam result for allocation:', err));
    }
  }, [skillGapAllocationId, effectiveAllocationId]);

  const memberName = member?.name || member?.user_name || 'Team Member';
  const memberRole = member?.designation || projectData?.designation_name || member?.role || 'Learner';
  const memberInitials = memberName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const submission = examResultData?.submission || {};

  // 1. Skill Gap Assessment Score — only if completed
  const skillGapScore = isSkillGapCompleted
    ? (skillGapQuiz?.score !== undefined 
      ? Math.round(skillGapQuiz.score) 
      : (submission?.obtained_percentage !== undefined ? Math.round(parseFloat(submission.obtained_percentage)) : 0))
    : null;

  // 2. Roadmap Progress
  const roadmapPct = member?.progress !== undefined ? member.progress : (member?.roadmapPercent || 0);
  const completedNodes = member?.completed_nodes !== undefined ? member.completed_nodes : 0;
  const totalNodes = member?.total_nodes !== undefined && member.total_nodes > 0 ? member.total_nodes : 12;
  const remainingNodes = Math.max(0, totalNodes - completedNodes);

  // Time calculations based on progress
  const hoursSpent = Math.floor((completedNodes * 45) / 60);
  const minsSpent = (completedNodes * 45) % 60;
  const timeSpentStr = completedNodes > 0 ? `${hoursSpent}h ${minsSpent}m` : '0h 0m';
  const remHours = Math.ceil((remainingNodes * 45) / 60);
  const estRemainingStr = remainingNodes > 0 ? `~${remHours}h estimated remaining` : 'Roadmap complete!';

  // 3. Capstone Project Data
  const capstoneProject = member?.capstone_project || null;
  const capstonePercent = capstoneProject?.percent !== undefined 
    ? capstoneProject.percent 
    : (member?.capstonePercent || 0);
  const capstoneStatusStr = capstoneProject?.status || member?.capstoneStatus || 'Not started';
  const capstoneTitle = capstoneProject?.title || 'Capstone Project';
  const capstoneDesc = capstoneProject?.description || 'Comprehensive end-of-course practical project submission.';
  const capstoneChapter = capstoneProject?.chapter_name || 'Roadmap Capstone';

  const defaultChapters = [
    {
      id: 1,
      title: '1. Python Programming Fundamentals',
      modulesCount: 5,
      doneCount: Math.min(5, completedNodes),
      status: completedNodes >= 5 ? 'Done' : (completedNodes > 0 ? 'In Progress' : 'Not Started'),
      subModules: [
        { name: 'Python Syntax and Data Types', status: completedNodes >= 1 ? 'Completed' : 'Not Started' },
        { name: 'Control Flow and Functions', status: completedNodes >= 2 ? 'Completed' : 'Not Started' },
        { name: 'Object-Oriented Programming in Python', status: completedNodes >= 3 ? 'Completed' : 'Not Started' },
        { name: 'Error Handling and Debugging', status: completedNodes >= 4 ? 'Completed' : 'Not Started' },
        { name: 'Assessment', status: completedNodes >= 5 ? 'Completed' : 'Not Started' },
      ],
    },
    {
      id: 2,
      title: '2. Data Structures and Algorithms',
      modulesCount: 5,
      doneCount: Math.max(0, Math.min(5, completedNodes - 5)),
      status: completedNodes >= 10 ? 'Done' : (completedNodes > 5 ? 'In Progress' : 'Not Started'),
      subModules: [
        { name: 'Arrays and Linked Lists', status: completedNodes >= 6 ? 'Completed' : 'Not Started' },
        { name: 'Stacks and Queues', status: completedNodes >= 7 ? 'Completed' : 'Not Started' },
        { name: 'Trees and Graphs', status: completedNodes >= 8 ? 'Completed' : 'Not Started' },
        { name: 'Sorting and Searching Algorithms', status: completedNodes >= 9 ? 'Completed' : 'Not Started' },
        { name: 'Assessment', status: completedNodes >= 10 ? 'Completed' : 'Not Started' },
      ],
    },
  ];

  const activeChapters = (member?.roadmap_chapters && member.roadmap_chapters.length > 0)
    ? member.roadmap_chapters
    : defaultChapters;

  // Real Dynamic Quiz List directly from member.user_quizzes (excluding baseline skill-gap assessment & dummy un-taken placeholders)
  const dynamicQuizList = useMemo(() => {
    if (member?.user_quizzes && member.user_quizzes.length > 0) {
      // Map node_id and chapter submodule indices from activeChapters
      const nodeToSubmodule = {};
      const chapterIndexToSubmodule = {};

      activeChapters.forEach((ch, chIdx) => {
        const subMods = ch.subModules || ch.sub_modules || [];
        subMods.forEach((sm, smIdx) => {
          const sName = sm.name || sm.title || 'Module';
          if (sm.id) nodeToSubmodule[sm.id] = sName;
          if (sm.name) nodeToSubmodule[sm.name] = sName;
          if (sm.quiz?.id) nodeToSubmodule[sm.quiz.id] = sName;
          if (sm.quiz?.node_id) nodeToSubmodule[sm.quiz.node_id] = sName;
          chapterIndexToSubmodule[`${chIdx}_${smIdx}`] = sName;
          chapterIndexToSubmodule[`${ch.id || (chIdx + 1)}_${smIdx + 1}`] = sName;
        });
      });

      return member.user_quizzes
        .filter((uq) => {
          if (uq.assessment_type === 'skill_gap_assessment') return false;
          if (uq.title === 'Skill-Gap Baseline Assessment' || uq.chapter_name === 'Baseline Assessment') return false;
          if (uq.status === 'Not Started' && !uq.allocation_id && uq.correctText === '0/10 correct') return false;
          return true;
        })
        .map((uq, idx) => {
          // Resolve submodule name:
          let resolvedModuleName = null;

          // 1. Direct node match
          if (uq.node_id && nodeToSubmodule[uq.node_id]) {
            resolvedModuleName = nodeToSubmodule[uq.node_id];
          }

          // 2. Pattern match in title like "Crack it - 1.2" or "Quiz 1.2"
          if (!resolvedModuleName && uq.title) {
            const m = uq.title.match(/(\d+)\.(\d+)/);
            if (m) {
              const chNum = parseInt(m[1], 10);
              const modNum = parseInt(m[2], 10);
              resolvedModuleName = chapterIndexToSubmodule[`${chNum}_${modNum}`];
              if (!resolvedModuleName) {
                const ch = activeChapters.find(c => c.id === chNum) || activeChapters[chNum - 1];
                const subMods = ch?.subModules || ch?.sub_modules || [];
                const targetMod = subMods[modNum - 1];
                if (targetMod && (targetMod.name || targetMod.title)) {
                  resolvedModuleName = targetMod.name || targetMod.title;
                }
              }
            }
          }

          // 3. If module_name exists and is valid (not same as chapter or generic)
          if (!resolvedModuleName && uq.module_name && uq.module_name !== uq.chapter_name && !['general', 'roadmap module', 'roadmap quizzes'].includes(uq.module_name.toLowerCase())) {
            resolvedModuleName = uq.module_name;
          }

          // 4. Fallback by index within matching chapter's subModules
          if (!resolvedModuleName && uq.chapter_name) {
            const ch = activeChapters.find(
              c => cleanTitle(c.title).toLowerCase() === cleanTitle(uq.chapter_name).toLowerCase() ||
                   cleanTitle(c.title).toLowerCase().includes(cleanTitle(uq.chapter_name).toLowerCase()) ||
                   cleanTitle(uq.chapter_name).toLowerCase().includes(cleanTitle(c.title).toLowerCase())
            );
            if (ch) {
              const subMods = ch.subModules || ch.sub_modules || [];
              const sm = subMods[idx % (subMods.length || 1)];
              if (sm && (sm.name || sm.title)) {
                resolvedModuleName = sm.name || sm.title;
              }
            }
          }

          const finalModuleName = resolvedModuleName || uq.module_name || uq.chapter_name || 'General';

          return {
            id: uq.id || idx + 1,
            title: uq.title || `Quiz ${idx + 1}`,
            chapter_name: uq.chapter_name || 'General',
            module_name: finalModuleName,
            assessment_type: uq.assessment_type || 'roadmap_learning_assessment',
            status: uq.status || (uq.score > 0 ? 'Completed' : 'Not Started'),
            score: uq.score || 0,
            correctText: uq.correctText || `${uq.correct_answers || 0}/${uq.total_questions || 5} correct`,
            totalQuestions: uq.total_questions || 5,
            correctQuestions: uq.correct_answers || 0,
            allocation_id: uq.allocation_id || null,
            submission_time: uq.submission_time || null,
            node_id: uq.node_id || null,
            questions: uq.questions || [],
          };
        });
    }
    return [];
  }, [member?.user_quizzes, activeChapters]);

  const totalQuizzesCount = dynamicQuizList.length;
  const takenQuizzesList = dynamicQuizList.filter(q => q.status === 'Completed' || q.score > 0);
  const takenQuizzesCount = takenQuizzesList.length;
  const avgQuizScore = takenQuizzesCount > 0 
    ? Math.round(takenQuizzesList.reduce((acc, q) => acc + q.score, 0) / takenQuizzesCount) 
    : 0;

  const [quizViewMode, setQuizViewMode] = useState('grouped'); // 'grouped' | 'table'

  // Group quizzes by chapter/module
  const groupedQuizzes = useMemo(() => {
    const map = {};
    const filtered = dynamicQuizList.filter((q) => {
      const qText = quizSearch.toLowerCase().trim();
      if (!qText) return true;
      return (
        (q.title && q.title.toLowerCase().includes(qText)) ||
        (q.module_name && q.module_name.toLowerCase().includes(qText)) ||
        (q.chapter_name && q.chapter_name.toLowerCase().includes(qText))
      );
    });

    filtered.forEach((q) => {
      const key = q.chapter_name || q.module_name || 'General';
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(q);
    });

    return map;
  }, [dynamicQuizList, quizSearch]);

  const handleReviewClick = async (quizItem) => {
    if (quizItem.allocation_id) {
      try {
        const res = await getExamResult(quizItem.allocation_id);
        if (res && res.submission) {
          const sub = res.submission;
          const questions = sub.question_analysis || sub.detailed_result?.questions || quizItem.questions;
          setReviewingQuiz({
            ...quizItem,
            score: sub.obtained_percentage !== undefined ? Math.round(parseFloat(sub.obtained_percentage)) : quizItem.score,
            correctText: sub.total_number_of_correct_answer !== undefined ? `${sub.total_number_of_correct_answer}/${sub.total_number_of_question || sub.total_questions} correct` : quizItem.correctText,
            questions: questions
          });
          return;
        }
      } catch (err) {
        console.log("Failed to fetch detailed quiz review:", err);
      }
    }
    setReviewingQuiz(quizItem);
  };

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      {
        id: Date.now(),
        author: 'Current Manager',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        text: newComment.trim(),
        initials: 'CM',
      },
    ]);
    setNewComment('');
  };

  const toggleModule = (id) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Top Header Profile */}
        <div className={styles.headerBar}>
          <div className={styles.memberProfileGroup}>
            <div className={styles.avatarCircle}>{memberInitials}</div>
            <div>
              <h1 className={styles.memberName}>{memberName}</h1>
              <p className={styles.memberRole}>{memberRole}</p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className={styles.subTabsContainer}>
          <button
            className={`${styles.subTabBtn} ${activeTab === 'overview' ? styles.subTabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          {(isSkillGapOnly || isBoth) && (
            <button
              className={`${styles.subTabBtn} ${activeTab === 'skill_gap' ? styles.subTabBtnActive : ''}`}
              onClick={() => setActiveTab('skill_gap')}
            >
              Skill – gap analysis{' '}
              <span className={styles.badgePill}>
                {skillGapScore !== null ? `${skillGapScore}%` : 'Not started'}
              </span>
            </button>
          )}
          {(isRoadmapOnly || isBoth) && (
            <button
              className={`${styles.subTabBtn} ${activeTab === 'roadmap' ? styles.subTabBtnActive : ''}`}
              onClick={() => setActiveTab('roadmap')}
            >
              Learning roadmap{' '}
              <span className={styles.badgePill}>{roadmapPct}%</span>
            </button>
          )}
          {(isRoadmapOnly || isBoth) && (
            <button
              className={`${styles.subTabBtn} ${activeTab === 'quizzes' ? styles.subTabBtnActive : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              Quizzes{' '}
              <span className={styles.badgePill}>{`${takenQuizzesCount}/${totalQuizzesCount}`}</span>
            </button>
          )}
          {(isRoadmapOnly || isBoth) && (
            <button
              className={`${styles.subTabBtn} ${activeTab === 'capstone' ? styles.subTabBtnActive : ''}`}
              onClick={() => setActiveTab('capstone')}
            >
              Capstone project{' '}
              <span className={styles.badgePill}>
                {capstoneStatusStr === 'Completed' ? 'Done' : (capstoneStatusStr === 'In Progress' ? `${capstonePercent}%` : 'Not started')}
              </span>
            </button>
          )}
        </div>

        {/* ── OVERVIEW SUB-TAB (Growth & Progress Timeline) ── */}
        {activeTab === 'overview' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Growth & progress</h2>
            <p className={styles.cardSubtitle}>Where this journey stands, stage by stage.</p>

            <div className={styles.stageList}>
              {/* Stage 1: Skill Gap */}
              {(isSkillGapOnly || isBoth) && (
                <div className={styles.stageItem}>
                  <div className={skillGapScore !== null && skillGapScore > 0 ? styles.stageIconCompleted : styles.stageIconActive}>
                    {skillGapScore !== null && skillGapScore > 0 ? '✓' : '●'}
                  </div>
                  <div className={styles.stageInfo}>
                    <div className={styles.stageName}>Skill-gap Assessment</div>
                    <div className={styles.stageSubtext}>{skillGapScore !== null ? `Assessed ${skillGapScore}%` : 'Not started'}</div>
                  </div>
                  <div className={styles.stageProgressTrack}>
                    <div className={styles.stageProgressFill} style={{ width: `${skillGapScore || 0}%` }}></div>
                  </div>
                  <span className={styles.stagePctText}>{skillGapScore !== null ? `${skillGapScore}%` : '0%'}</span>
                </div>
              )}

              {/* Stage 2: Roadmap */}
              {(isRoadmapOnly || isBoth) && (
                <div className={styles.stageItem}>
                  <div className={roadmapPct >= 100 ? styles.stageIconCompleted : styles.stageIconActive}>
                    {roadmapPct >= 100 ? '✓' : '●'}
                  </div>
                  <div className={styles.stageInfo}>
                    <div className={styles.stageName}>Learning Roadmap</div>
                    <div className={styles.stageSubtext}>{roadmapPct}% done ({completedNodes}/{totalNodes} nodes)</div>
                  </div>
                  <div className={styles.stageProgressTrack}>
                    <div className={styles.stageProgressFill} style={{ width: `${roadmapPct}%` }}></div>
                  </div>
                  <span className={styles.stagePctText}>{roadmapPct}%</span>
                </div>
              )}

              {/* Stage 3: Quizzes */}
              {(isRoadmapOnly || isBoth) && (
                <div className={styles.stageItem}>
                  <div className={takenQuizzesCount > 0 ? (avgQuizScore >= 80 ? styles.stageIconCompleted : styles.stageIconActive) : styles.stageIconEmpty}>
                    {takenQuizzesCount > 0 ? (avgQuizScore >= 80 ? '✓' : '●') : '○'}
                  </div>
                  <div className={styles.stageInfo}>
                    <div className={styles.stageName}>Quizzes</div>
                    <div className={styles.stageSubtext}>
                      {takenQuizzesCount > 0 ? `${takenQuizzesCount}/${totalQuizzesCount} taken · avg ${avgQuizScore}%` : '0 taken'}
                    </div>
                  </div>
                  <div className={styles.stageProgressTrack}>
                    <div className={styles.stageProgressFill} style={{ width: `${avgQuizScore}%` }}></div>
                  </div>
                  <span className={styles.stagePctText}>{avgQuizScore}%</span>
                </div>
              )}

              {/* Stage 4: Capstone */}
              {(isRoadmapOnly || isBoth) && (
                <div className={styles.stageItem}>
                  <div className={capstonePercent >= 100 ? styles.stageIconCompleted : styles.stageIconEmpty}>
                    {capstonePercent >= 100 ? '✓' : '○'}
                  </div>
                  <div className={styles.stageInfo}>
                    <div className={styles.stageName}>Capstone Project</div>
                    <div className={styles.stageSubtext}>{capstoneStatusStr}</div>
                  </div>
                  <div className={styles.stageProgressTrack}>
                    <div className={styles.stageProgressFill} style={{ width: `${capstonePercent}%` }}></div>
                  </div>
                  <span className={styles.stagePctText}>{capstonePercent}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SKILL - GAP ANALYSIS SUB-TAB (Matching SkillGapAnalysis Panel) ── */}
        {activeTab === 'skill_gap' && (
          <div className={styles.skillGapLayout}>
            {isSkillGapCompleted && (skillGapAllocationId || effectiveAllocationId) ? (
              <ShifuSkillGapAnalysis allocationId={skillGapAllocationId || effectiveAllocationId} embedded={true} />
            ) : (
              <div style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE8E1' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C23', marginBottom: '8px' }}>
                  No Skill Gap Assessment Result Yet
                </h3>
                <p style={{ color: '#7A8099', fontSize: '14px', maxWidth: '500px', margin: '0 auto 16px' }}>
                  This member has not yet completed the skill gap assessment for this project.
                </p>
                <span style={{ display: 'inline-block', padding: '6px 14px', background: '#F4F5F7', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#5C6070' }}>
                  Assessment Status: {skillGapQuiz?.status || member?.assessmentStatus || 'Not started'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── LEARNING ROADMAP SUB-TAB (Figma Design Spec) ── */}
        {activeTab === 'roadmap' && (
          <div className={styles.roadmapLayout}>
            {/* StatsStrip: 3-column top stat strip */}
            <div className={styles.statsStrip}>
              {/* Column 1: Overall completion */}
              <div className={styles.statsCol}>
                <span className={styles.statsLabel}>Overall completion</span>
                <div className={styles.statsValTeal}>{roadmapPct}%</div>
                <div className={styles.statsTrack}>
                  <div className={styles.statsFill} style={{ width: `${roadmapPct}%` }}></div>
                </div>
              </div>

              {/* Column 2: Chapters */}
              <div className={`${styles.statsCol} ${styles.statsColBorder}`}>
                <span className={styles.statsLabel}>Chapters</span>
                <div className={styles.statsValDark}>
                  {completedNodes} <span style={{ color: '#7A8099', fontSize: '18px', fontWeight: 400 }}>/ {totalNodes}</span>
                </div>
                <span className={styles.statsSubtext}>{remainingNodes} chapters remaining</span>
              </div>

              {/* Column 3: Time spent */}
              <div className={`${styles.statsCol} ${styles.statsColBorder}`}>
                <span className={styles.statsLabel}>Time spent</span>
                <div className={styles.statsValDark}>{timeSpentStr}</div>
                <span className={styles.statsSubtext}>{estRemainingStr}</span>
              </div>
            </div>

            {/* Module → Chapter tree (matches design reference) */}
            {activeChapters.map((ch, idx) => {
              const chId = ch.id || idx + 1;
              const isDone = ch.status === 'Done';
              const isInProgress = ch.status === 'In Progress';
              const subModules = ch.subModules || [];

              return (
                <div key={chId} style={{
                  background: '#F7F5F0',
                  border: '1px solid #EAE6DF',
                  borderRadius: '14px',
                  marginBottom: '16px',
                  padding: '18px 20px 12px 20px',
                }}>
                  {/* Module title — bold, no number */}
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 700,
                    fontSize: '14.5px',
                    color: '#0F1117',
                    marginBottom: '12px',
                  }}>
                    {cleanTitle(ch.title)}
                  </div>

                  {/* Chapter rows inside the module */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {subModules.length > 0 ? subModules.map((sub, sIdx) => {
                      const subDone = sub.status === 'Completed' || sub.status === 'Done';
                      const subProgress = sub.status === 'In Progress' || sub.status === 'In progress';
                      const statusLabel = subDone ? 'Completed' : (subProgress ? 'In Progress' : 'Not Started');
                      const statusColor = subDone ? '#1D6A72' : (subProgress ? '#8A6A10' : '#9AA0B4');

                      return (
                        <div key={sIdx} style={{
                          background: '#FFFFFF',
                          border: '1px solid #EAE6DF',
                          borderRadius: '10px',
                          padding: '13px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}>
                          {/* Chapter name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <span style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontWeight: 600,
                              fontSize: '13.5px',
                              color: '#0F1117',
                            }}>
                              {sub.name}
                            </span>
                            {sub.quiz && (
                              <span style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: sub.quiz.status === 'Completed' ? '#EAFAF1' : (sub.quiz.status === 'In Progress' ? '#FFF8E1' : '#F4F5F7'),
                                color: sub.quiz.status === 'Completed' ? '#27AE60' : (sub.quiz.status === 'In Progress' ? '#E67E22' : '#7A8099'),
                                border: `1px solid ${sub.quiz.status === 'Completed' ? '#A3E4D7' : (sub.quiz.status === 'In Progress' ? '#FFE082' : '#E4E7EB')}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {sub.quiz.status === 'Completed' ? `✓ Quiz: ${sub.quiz.score}% (${sub.quiz.correctText})` : (sub.quiz.status === 'In Progress' ? '⚡ Quiz in progress' : '○ Quiz: Not started')}
                              </span>
                            )}
                          </div>
                          {/* Status */}
                          <span style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: statusColor,
                            flexShrink: 0,
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                      );
                    }) : (
                      /* If no sub-modules yet, show the module itself as a chapter row */
                      <div style={{
                        background: '#FFFFFF',
                        border: '1px solid #EAE6DF',
                        borderRadius: '10px',
                        padding: '13px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}>
                        <span style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: '#0F1117',
                          flex: 1,
                        }}>
                          {cleanTitle(ch.title)}
                        </span>
                        <span style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: isDone ? '#1D6A72' : (isInProgress ? '#8A6A10' : '#9AA0B4'),
                          flexShrink: 0,
                        }}>
                          {isDone ? 'Completed' : (isInProgress ? 'In Progress' : 'Not Started')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Roadmap Capstone Project Node */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #C9A84C',
              borderRadius: '14px',
              marginBottom: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 2px 8px rgba(201, 168, 76, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: '#FAF4E1',
                  color: '#A67C1E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  🎯
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={styles.capstoneTag}>Capstone Project</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14.5px', color: '#0F1117' }}>
                      {capstoneTitle}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#7A8099', marginTop: '3px' }}>
                    {capstoneChapter} · End-of-course practical assessment & feature proposal
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {capstoneStatusStr === 'Completed' ? (
                  <span className={styles.statusBadgeDone} style={{ padding: '5px 12px' }}>
                    ✓ Done · {capstonePercent}%
                  </span>
                ) : (capstoneStatusStr === 'In Progress' ? (
                  <span className={styles.statusBadgeProgress} style={{ padding: '5px 12px' }}>
                    ⚡ In Progress · {capstonePercent}%
                  </span>
                ) : (
                  <span className={styles.statusBadgeNotStarted} style={{ padding: '5px 12px' }}>
                    ○ Not Started
                  </span>
                ))}
                <button
                  className={styles.quizActionBtn}
                  onClick={() => setActiveTab('capstone')}
                >
                  View Details
                </button>
              </div>
            </div>





            {/* Manager Notes Container */}
            <div className={styles.managerNotesSectionTitle}>Manager notes</div>
            <div className={styles.managerNotesCard}>
              {comments.length > 0 ? (
                <div style={{ width: '100%' }}>
                  {comments.map((c) => (
                    <div key={c.id} className={styles.managerCommentItem}>
                      <div className={styles.managerAvatarCircle}>{c.initials}</div>
                      <div className={styles.managerCommentContent}>
                        <div className={styles.managerAuthorRow}>
                          <span className={styles.managerAuthorName}>{c.author}</span>
                          <span className={styles.managerCommentDate}>{c.date}</span>
                        </div>
                        <div className={styles.managerCommentBody}>{c.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#7A8099', fontSize: '13px', margin: '0 0 16px 0', fontFamily: 'DM Sans' }}>
                  No manager notes added yet for this member.
                </p>
              )}

              <div className={styles.managerInputSection}>
                <input
                  type="text"
                  className={styles.managerInputText}
                  placeholder="Add a note or feedback for this learner..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                />
                <button className={styles.managerPostBtn} onClick={handlePostComment}>
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── QUIZZES SUB-TAB (Dynamic Real API & Roadmap Data) ── */}
        {activeTab === 'quizzes' && (
          <div className={styles.quizzesMainCard}>
            {/* Header Title & Subtitle */}
            <div className={styles.quizzesHeaderRow}>
              <div className={styles.quizzesTitleGroup}>
                <h3 className={styles.quizzesMainTitle}>Quizzes & Assessments</h3>
                <span className={styles.quizzesSubTitle}>
                  {totalQuizzesCount} created · {takenQuizzesCount} taken · avg {avgQuizScore}% score
                </span>
              </div>
            </div>

            {/* Top 3 Stat Cards */}
            <div className={styles.quizzesStatsGrid}>
              <div className={styles.quizStatCard}>
                <span className={styles.quizStatLabel}>Total quizzes</span>
                <div className={styles.quizStatValue}>{totalQuizzesCount}</div>
              </div>
              <div className={styles.quizStatCard}>
                <span className={styles.quizStatLabel}>Taken</span>
                <div className={styles.quizStatValue}>{takenQuizzesCount}</div>
              </div>
              <div className={styles.quizStatCard}>
                <span className={styles.quizStatLabel}>Average score</span>
                <div className={styles.quizStatValue}>{avgQuizScore}%</div>
              </div>
            </div>

            {/* View Toggle and Search Bar */}
            <div className={styles.quizViewToggleRow}>
              <input
                type="text"
                className={styles.quizSearchInput}
                style={{ flex: 1, minWidth: '260px', margin: 0 }}
                placeholder={`Search ${dynamicQuizList.length} quizzes by name or module…`}
                value={quizSearch}
                onChange={(e) => setQuizSearch(e.target.value)}
              />
              <div className={styles.quizViewToggleGroup}>
                <button
                  className={`${styles.quizViewToggleBtn} ${quizViewMode === 'grouped' ? styles.quizViewToggleBtnActive : ''}`}
                  onClick={() => setQuizViewMode('grouped')}
                >
                  Grouped by Chapter
                </button>
                <button
                  className={`${styles.quizViewToggleBtn} ${quizViewMode === 'table' ? styles.quizViewToggleBtnActive : ''}`}
                  onClick={() => setQuizViewMode('table')}
                >
                  All Quizzes ({dynamicQuizList.length})
                </button>
              </div>
            </div>

            {/* Grouped by Chapter & Module View */}
            {quizViewMode === 'grouped' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                {Object.keys(groupedQuizzes).length > 0 ? (
                  Object.entries(groupedQuizzes).map(([chapterName, quizzes], gIdx) => {
                    const chTaken = quizzes.filter(q => q.status === 'Completed' || q.score > 0).length;
                    const chTotal = quizzes.length;
                    const chAvg = chTaken > 0 ? Math.round(quizzes.filter(q => q.status === 'Completed' || q.score > 0).reduce((a, b) => a + b.score, 0) / chTaken) : 0;
                    const isCapstoneGroup = capstoneChapter && (chapterName.toLowerCase().includes('capstone') || chapterName.toLowerCase() === capstoneChapter.toLowerCase());

                    return (
                      <div key={gIdx} className={styles.quizChapterGroup}>
                        {/* Chapter / Module Header */}
                        <div className={styles.quizChapterHeader}>
                          <div className={styles.quizChapterTitleGroup}>
                            <div className={styles.quizChapterIcon}>
                              {chTaken === chTotal && chTotal > 0 ? '✓' : (chTaken > 0 ? '⚡' : '📖')}
                            </div>
                            <div>
                              <h4 className={styles.quizChapterTitle}>{cleanTitle(chapterName)}</h4>
                              <span className={styles.quizChapterStats}>
                                {chTotal} {chTotal === 1 ? 'assessment' : 'assessments'} · {chTaken} completed
                                {chTaken > 0 ? ` · avg ${chAvg}%` : ''}
                              </span>
                            </div>
                          </div>

                          <div>
                            {chTaken === chTotal && chTotal > 0 ? (
                              <span className={styles.statusBadgeDone}>✓ All Completed</span>
                            ) : (chTaken > 0 ? (
                              <span className={styles.statusBadgeProgress}>⚡ {chTaken}/{chTotal} Taken</span>
                            ) : (
                              <span className={styles.statusBadgeNotStarted}>○ Not Started</span>
                            ))}
                          </div>
                        </div>

                        {/* If this chapter has a Capstone Project, show Capstone Card under the chapter */}
                        {isCapstoneGroup && (
                          <div style={{
                            padding: '16px 20px',
                            background: '#FAF8F5',
                            borderBottom: '1px solid #EAE6DF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '14px'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span className={styles.capstoneTag}>Capstone Project</span>
                                <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '13.5px', color: '#0F1117' }}>
                                  {capstoneTitle}
                                </span>
                              </div>
                              <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: '#7A8099' }}>
                                End-of-chapter practical milestone submission
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {capstoneStatusStr === 'Completed' ? (
                                <span className={styles.statusBadgeDone}>✓ Done · {capstonePercent}%</span>
                              ) : (capstoneStatusStr === 'In Progress' ? (
                                <span className={styles.statusBadgeProgress}>⚡ In Progress · {capstonePercent}%</span>
                              ) : (
                                <span className={styles.statusBadgeNotStarted}>○ Not Started</span>
                              ))}
                              <button
                                className={styles.quizActionBtn}
                                onClick={() => setActiveTab('capstone')}
                              >
                                View Capstone
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quizzes Table inside this Chapter */}
                        <div className={styles.quizTableScrollArea}>
                          <table className={styles.quizTable}>
                            <thead>
                              <tr className={styles.quizTheadRow}>
                                <th className={styles.quizTh} style={{ width: '45px' }}>#</th>
                                <th className={styles.quizTh}>Quiz</th>
                                <th className={styles.quizTh} style={{ width: '180px' }}>Module</th>
                                <th className={styles.quizTh} style={{ width: '90px' }}>Score</th>
                                <th className={styles.quizTh} style={{ width: '120px' }}>Result</th>
                                <th className={styles.quizTh} style={{ width: '110px' }}>Status</th>
                                <th className={styles.quizTh} style={{ textAlign: 'right', paddingRight: '20px', width: '150px' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quizzes.map((q, idx) => {
                                const isDone = q.status === 'Completed' || (q.score && q.score > 0);
                                const isProg = q.status === 'In Progress';
                                const badgeClass = q.score >= 75 
                                  ? styles.badgeHigh 
                                  : (q.score >= 50 ? styles.badgeMedium : (isDone ? styles.badgeLow : styles.statusBadgeNotStarted));

                                return (
                                  <tr key={q.id} className={styles.quizTbodyRow}>
                                    <td className={styles.quizTd}>
                                      <span className={styles.quizIndexText}>{idx + 1}</span>
                                    </td>
                                    <td className={styles.quizTd}>
                                      <span className={styles.quizTitleText}>{q.title}</span>
                                    </td>
                                    <td className={styles.quizTd}>
                                      <span style={{ fontSize: '12px', color: '#5C6070', fontFamily: 'DM Sans' }}>
                                        {cleanTitle(q.module_name) || '—'}
                                      </span>
                                    </td>
                                    <td className={styles.quizTd}>
                                      {isDone ? (
                                        <span className={badgeClass}>{q.score}%</span>
                                      ) : (
                                        <span style={{ color: '#9AA0B4', fontSize: '12px' }}>—</span>
                                      )}
                                    </td>
                                    <td className={styles.quizTd}>
                                      <span className={styles.resultText}>
                                        {isDone ? q.correctText : (isProg ? 'In Progress' : `0/${q.totalQuestions || 5}`)}
                                      </span>
                                    </td>
                                    <td className={styles.quizTd}>
                                      {isDone ? (
                                        <span className={styles.statusBadgeDone}>✓ Done</span>
                                      ) : (isProg ? (
                                        <span className={styles.statusBadgeProgress}>⚡ In Progress</span>
                                      ) : (
                                        <span className={styles.statusBadgeNotStarted}>○ Not Started</span>
                                      ))}
                                    </td>
                                    <td className={styles.quizTd} style={{ textAlign: 'right', paddingRight: '14px' }}>
                                      <div className={styles.quizActionBtnGroup}>
                                        <button
                                          className={styles.quizActionBtnLocked}
                                          disabled
                                          title="Review feature is coming soon"
                                        >
                                          <LockIcon />
                                          <span>Review</span>
                                        </button>
                                        <button
                                          className={styles.quizActionBtnLocked}
                                          disabled
                                          title="Retake feature is coming soon"
                                        >
                                          <LockIcon />
                                          <span>Retake</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #EAE6DF', color: '#7A8099' }}>
                    No quizzes found matching "{quizSearch}".
                  </div>
                )}
              </div>
            ) : (
              /* Flat Table Card */
              <div className={styles.quizTableCard}>
                <div className={styles.quizTableScrollArea}>
                  <table className={styles.quizTable}>
                    <thead>
                      <tr className={styles.quizTheadRow}>
                        <th className={styles.quizTh} style={{ width: '45px' }}>#</th>
                        <th className={styles.quizTh}>Quiz</th>
                        <th className={styles.quizTh} style={{ width: '180px' }}>Module</th>
                        <th className={styles.quizTh} style={{ width: '90px' }}>Score</th>
                        <th className={styles.quizTh} style={{ width: '120px' }}>Result</th>
                        <th className={styles.quizTh} style={{ width: '110px' }}>Status</th>
                        <th className={styles.quizTh} style={{ textAlign: 'right', paddingRight: '20px', width: '150px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dynamicQuizList
                        .filter((q) => {
                          const qText = quizSearch.toLowerCase().trim();
                          if (!qText) return true;
                          return (
                            (q.title && q.title.toLowerCase().includes(qText)) ||
                            (q.module_name && q.module_name.toLowerCase().includes(qText)) ||
                            (q.chapter_name && q.chapter_name.toLowerCase().includes(qText))
                          );
                        })
                        .map((q, idx) => {
                          const isDone = q.status === 'Completed' || (q.score && q.score > 0);
                          const isProg = q.status === 'In Progress';
                          const badgeClass = q.score >= 75 
                            ? styles.badgeHigh 
                            : (q.score >= 50 ? styles.badgeMedium : (isDone ? styles.badgeLow : styles.statusBadgeNotStarted));

                          return (
                            <tr key={q.id} className={styles.quizTbodyRow}>
                              <td className={styles.quizTd}>
                                <span className={styles.quizIndexText}>{idx + 1}</span>
                              </td>
                              <td className={styles.quizTd}>
                                <span className={styles.quizTitleText}>{q.title}</span>
                              </td>
                              <td className={styles.quizTd}>
                                <span style={{ fontSize: '12px', color: '#5C6070', fontFamily: 'DM Sans' }}>
                                  {cleanTitle(q.module_name) || '—'}
                                </span>
                              </td>
                              <td className={styles.quizTd}>
                                {isDone ? (
                                  <span className={badgeClass}>{q.score}%</span>
                                ) : (
                                  <span style={{ color: '#9AA0B4', fontSize: '12px' }}>—</span>
                                )}
                              </td>
                              <td className={styles.quizTd}>
                                <span className={styles.resultText}>
                                  {isDone ? q.correctText : (isProg ? 'In Progress' : `0/${q.totalQuestions || 5}`)}
                                </span>
                              </td>
                              <td className={styles.quizTd}>
                                {isDone ? (
                                  <span className={styles.statusBadgeDone}>✓ Done</span>
                                ) : (isProg ? (
                                  <span className={styles.statusBadgeProgress}>⚡ In Progress</span>
                                ) : (
                                  <span className={styles.statusBadgeNotStarted}>○ Not Started</span>
                                ))}
                              </td>
                              <td className={styles.quizTd} style={{ textAlign: 'right', paddingRight: '14px' }}>
                                <div className={styles.quizActionBtnGroup}>
                                  <button
                                    className={styles.quizActionBtnLocked}
                                    disabled
                                    title="Review feature is coming soon"
                                  >
                                    <LockIcon />
                                    <span>Review</span>
                                  </button>
                                  <button
                                    className={styles.quizActionBtnLocked}
                                    disabled
                                    title="Retake feature is coming soon"
                                  >
                                    <LockIcon />
                                    <span>Retake</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ REVIEW MODAL ── */}
        {reviewingQuiz && (
          <div className={styles.modalOverlay} onClick={() => setReviewingQuiz(null)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <h3 className={styles.modalQuizTitle}>{reviewingQuiz.title}</h3>
                  <div className={styles.modalQuizSub}>
                    <span className={reviewingQuiz.score >= 75 ? styles.badgeHigh : (reviewingQuiz.score >= 50 ? styles.badgeMedium : styles.badgeLow)}>
                      {reviewingQuiz.score}% Score
                    </span>
                    <span>· {reviewingQuiz.correctText}</span>
                  </div>
                </div>
                <button className={styles.btnCloseModal} onClick={() => setReviewingQuiz(null)}>✕</button>
              </div>

              <div className={styles.modalBody}>
                {reviewingQuiz.questions && reviewingQuiz.questions.length > 0 ? (
                  reviewingQuiz.questions.map((q, idx) => (
                    <div key={idx} className={styles.quizQuestionCard}>
                      <div className={styles.qMetaRow}>
                        <span className={styles.qNumBadge}>Question {q.num || idx + 1}</span>
                        <span className={q.userStatus === 'correct' ? styles.qStatusCorrect : (q.userStatus === 'partial' ? styles.qStatusPartial : styles.qStatusIncorrect)}>
                          {q.userStatus === 'correct' ? '✓ Correct' : (q.userStatus === 'partial' ? '⚡ Partial' : '✗ Incorrect')}
                        </span>
                      </div>
                      <p className={styles.qStatement}>{q.statement || q.question_text || q.title}</p>
                      <div className={styles.qOptionsList}>
                        {(q.options || [
                          { text: 'A. Primary correct solution', isCorrect: true, isUserChoice: true },
                          { text: 'B. Secondary alternative', isCorrect: false },
                        ]).map((opt, oIdx) => {
                          const isCorrect = opt.isCorrect || opt.is_correct;
                          const isUser = opt.isUserChoice || opt.is_user_choice;
                          const optClass = isCorrect 
                            ? styles.optItemCorrect 
                            : (isUser ? styles.optItemIncorrect : styles.optItemNormal);

                          return (
                            <div key={oIdx} className={optClass}>
                              <span>{opt.text || opt.option_text || opt}</span>
                              {isCorrect && <span>✓ Correct Answer</span>}
                              {!isCorrect && isUser && <span>✗ Selected</span>}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className={styles.qExplanation}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#7A8099' }}>
                    Detailed question breakdown completed for this assessment.
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.btnSecondary} onClick={() => setReviewingQuiz(null)}>Close</button>
                <button
                  className={styles.btnPrimaryTeal}
                  onClick={() => {
                    alert(`Retake initiated for ${reviewingQuiz.title}`);
                    setReviewingQuiz(null);
                  }}
                >
                  Retake Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CAPSTONE SUB-TAB (Dynamic Real Backend & Roadmap Data) ── */}
        {activeTab === 'capstone' && (
          <div className={styles.capstoneSectionCard}>
            <div className={styles.capstoneBanner}>
              <div>
                <span className={styles.capstoneTag}>Capstone Project</span>
                <h3 className={styles.capstoneMainTitle}>{capstoneTitle}</h3>
                <p className={styles.capstoneScopeText}>
                  {capstoneChapter} · {capstoneProject?.module_name || 'Comprehensive Roadmap Project'}
                </p>
              </div>
              <div>
                {capstoneStatusStr === 'Completed' ? (
                  <span className={styles.statusBadgeDone} style={{ fontSize: '13px', padding: '6px 16px' }}>
                    ✓ Done · {capstonePercent}% Score
                  </span>
                ) : (capstoneStatusStr === 'In Progress' ? (
                  <span className={styles.statusBadgeProgress} style={{ fontSize: '13px', padding: '6px 16px' }}>
                    ⚡ In Progress · {capstonePercent}%
                  </span>
                ) : (
                  <span className={styles.statusBadgeNotStarted} style={{ fontSize: '13px', padding: '6px 16px' }}>
                    ○ Not Started
                  </span>
                ))}
              </div>
            </div>

            {/* Capstone Metrics Grid */}
            <div className={styles.capstoneDetailsGrid}>
              <div className={styles.capstoneDetailItem}>
                <div className={styles.capstoneDetailLabel}>Status</div>
                <div className={styles.capstoneDetailValue} style={{
                  color: capstoneStatusStr === 'Completed' ? '#2E7D32' : (capstoneStatusStr === 'In Progress' ? '#B78103' : '#7A8099')
                }}>
                  {capstoneStatusStr}
                </div>
              </div>
              <div className={styles.capstoneDetailItem}>
                <div className={styles.capstoneDetailLabel}>Evaluation Score</div>
                <div className={styles.capstoneDetailValue} style={{ color: '#1D6A72' }}>
                  {capstonePercent}%
                </div>
              </div>
              <div className={styles.capstoneDetailItem}>
                <div className={styles.capstoneDetailLabel}>Milestone Result</div>
                <div className={styles.capstoneDetailValue}>
                  {capstoneProject?.correct_text || (capstoneStatusStr === 'Completed' ? '100% (Passed)' : 'Pending')}
                </div>
              </div>
              <div className={styles.capstoneDetailItem}>
                <div className={styles.capstoneDetailLabel}>Submission Date</div>
                <div className={styles.capstoneDetailValue} style={{ fontSize: '13px' }}>
                  {capstoneProject?.submission_time || 'Awaiting completion'}
                </div>
              </div>
            </div>

            {/* Project Scope Description */}
            <div className={styles.capstoneDescBox}>
              <strong>Project Overview & Requirements:</strong>
              <div style={{ marginTop: '6px' }}>
                {capstoneDesc}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#6A7085' }}>
                This capstone project validates all technical depth, architectural principles, and domain competencies acquired throughout the learning roadmap.
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                className={styles.btnSecondary}
                onClick={() => setActiveTab('roadmap')}
              >
                View in Roadmap
              </button>
              <button
                className={styles.btnPrimaryTeal}
                onClick={() => alert(`Capstone Project status: ${capstoneStatusStr}`)}
              >
                {capstoneStatusStr === 'Completed' ? 'Review Submission' : 'Track Milestone'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDetailView;
