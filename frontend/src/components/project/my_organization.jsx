'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './my_organization.module.css';
import MemberDetailView from './MemberDetailView';
import { useAuthStore } from '@/store/authStore';

const MyOrganization = ({ projectData }) => {
  const searchParams = useSearchParams();
  const userDetails = useAuthStore((s) => s.userDetails);

  const [activeTab, setActiveTab] = useState('assigned'); // 'overview' | 'assigned' | 'leaderboard'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('progress_desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedDepts, setExpandedDepts] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);

  if (selectedMember) {
    return (
      <MemberDetailView
        member={selectedMember}
        projectData={projectData}
        onBack={() => setSelectedMember(null)}
      />
    );
  }

  const projectName = projectData?.project_name || 'Currently unavailable';
  const createdBy = projectData?.created_by_email || projectData?.created_by_name || projectData?.organization_name || 'Currently unavailable';
  const createdOn = projectData?.created_at
    ? new Date(projectData.created_at).toLocaleDateString('en-GB')
    : 'Currently unavailable';

  const mandateParam = searchParams ? searchParams.get('mandate') : null;
  const isSelfMandate = (projectData?.project_details?.project_mandate || mandateParam || '').toLowerCase() === 'self';

  const rawMembers = useMemo(() => {
    const list = projectData?.assigned_members || [];

    const currentUserId = userDetails?.id || userDetails?.user_id;
    const currentUserEmail = (userDetails?.email || '').toLowerCase().trim();
    const currentUserName = userDetails?.name || userDetails?.user_name || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Learner');

    // #changes 28-09-2026 - start: Isolate member data for non-admins (Learner only sees self)
    const userRole = (userDetails?.role || userDetails?.provided_role || '').toLowerCase().trim();
    const isAdmin = ['admin', 'superadmin', 'organization_admin'].includes(userRole);

    // 1. Admin: Return full org list
    if (isAdmin && list.length > 0) {
      return list;
    }

    // 2. Non-Admin (Learner): Return only their own record
    if (!isAdmin && list.length > 0) {
      const ownRecord = list.find((m) => {
        if (currentUserId && (String(m.id) === String(currentUserId) || String(m.user_id) === String(currentUserId))) return true;
        if (currentUserEmail && m.email && m.email.toLowerCase().trim() === currentUserEmail) return true;
        return false;
      });

      if (ownRecord) {
        return [ownRecord];
      }
    }
    // #changes 28-09-2026 - end

    return [{
      id: currentUserId || projectData?.created_by || '1',
      name: currentUserName,
      email: currentUserEmail || projectData?.created_by_email || '',
      role: projectData?.designation_name || userDetails?.designation || 'Learner',
      unit: projectData?.function_name || 'General',
      manager: '—',
      status: 'Not started',
      progress: 0,
      completed_nodes: 0,
      total_nodes: 0,
      user_quizzes: [],
    }];
  }, [projectData, userDetails]);

  const projectType = (projectData?.project_details?.project_type || projectData?.project_type || '').toLowerCase();
  const isSkillGapOnly = projectType === 'skill_gap_assessment';
  const isRoadmapOnly = projectType === 'roadmap';
  const isBoth = !isSkillGapOnly && !isRoadmapOnly;

  const members = useMemo(() => {
    return rawMembers.map((m, idx) => {
      const userQuizzes = m.user_quizzes || [];

      // Skill-gap score: from the skill_gap_assessment quiz
      const skillGapQuiz = userQuizzes.find(
        q => q.assessment_type === 'skill_gap_assessment' && (q.status === 'Completed' || q.submission_time || (q.score !== null && q.score !== undefined && q.score > 0))
      );
      const isSkillGapDone = Boolean(skillGapQuiz && (skillGapQuiz.status === 'Completed' || skillGapQuiz.submission_time || (skillGapQuiz.score !== null && skillGapQuiz.score !== undefined && skillGapQuiz.score > 0)));
      const skillGapScore = isSkillGapDone ? Math.round(skillGapQuiz.score || 0) : null;

      const rawSkillGapQuiz = userQuizzes.find(q => q.assessment_type === 'skill_gap_assessment');
      const isSkillGapInProgress = Boolean(rawSkillGapQuiz && rawSkillGapQuiz.status === 'In Progress' && !isSkillGapDone);

      // Roadmap progress %
      const roadmapPct = m.progress !== undefined ? Math.round(m.progress) : 0;
      const completedNodesCount = m.completed_nodes !== undefined ? m.completed_nodes : (m.completedNodes || 0);

      // Quiz avg: average score of only TAKEN roadmap learning assessment quizzes
      const learningQuizzes = userQuizzes.filter(q => q.assessment_type === 'roadmap_learning_assessment');
      const takenLearningQuizzes = learningQuizzes.filter(
        q => q.status === 'Completed' || q.submission_time || (q.score !== null && q.score !== undefined && q.score > 0)
      );
      const quizAvgScore = takenLearningQuizzes.length > 0
        ? Math.round(takenLearningQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / takenLearningQuizzes.length)
        : null;

      // Capstone Project score (0% if none)
      const capstoneScore = m.capstonePercent !== undefined ? Math.round(m.capstonePercent) : (m.capstone_project?.percent || 0);

      // Overall % calculation based on project entry type:
      let overallPct = 0;
      if (isSkillGapOnly) {
        overallPct = skillGapScore !== null ? skillGapScore : 0;
      } else if (isRoadmapOnly) {
        overallPct = roadmapPct;
      } else {
        const sg = skillGapScore !== null ? skillGapScore : 0;
        const rm = roadmapPct;
        const qz = quizAvgScore !== null ? quizAvgScore : 0;
        const cp = capstoneScore;
        overallPct = Math.round((sg + rm + qz + cp) / 4);
      }

      // Assessment Status calculation:
      let calculatedStatus = 'Not started';
      if (isSkillGapOnly) {
        if (isSkillGapDone) {
          calculatedStatus = 'Completed';
        } else if (isSkillGapInProgress) {
          calculatedStatus = 'In progress';
        } else {
          calculatedStatus = 'Not started';
        }
      } else if (isRoadmapOnly) {
        const hasStarted = roadmapPct > 0 || completedNodesCount > 0 || takenLearningQuizzes.length > 0 || capstoneScore > 0;
        if (roadmapPct >= 100) {
          calculatedStatus = 'Completed';
        } else if (hasStarted) {
          calculatedStatus = 'In progress';
        } else {
          calculatedStatus = 'Not started';
        }
      } else {
        // Both Roadmap & Skill Gap
        const sgDone = isSkillGapDone;
        const rmDone = roadmapPct >= 100;
        const hasStarted = sgDone || isSkillGapInProgress || roadmapPct > 0 || completedNodesCount > 0 || takenLearningQuizzes.length > 0 || capstoneScore > 0;
        if (sgDone && rmDone) {
          calculatedStatus = 'Completed';
        } else if (hasStarted) {
          calculatedStatus = 'In progress';
        } else {
          calculatedStatus = 'Not started';
        }
      }

      return {
        id: m.id || idx + 1,
        name: m.name || m.user_name || 'Unknown',
        email: m.email || '',
        role: m.designation || projectData?.designation_name || m.role || 'Learner',
        unit: m.department || m.unit || projectData?.function_name || 'General',
        manager: m.manager || '—',
        assessmentStatus: calculatedStatus,
        skillGapScore,
        roadmapPct,
        quizAvgScore,
        learningQuizzesCount: learningQuizzes.length,
        totalQuizzesCount: learningQuizzes.length,
        capstoneScore,
        capstone_project: m.capstone_project,
        capstonePercent: capstoneScore,
        capstoneStatus: m.capstoneStatus || m.capstone_project?.status || 'Not started',
        total_quizzes_count: learningQuizzes.length,
        taken_quizzes_count: takenLearningQuizzes.length,
        avg_quiz_score: quizAvgScore !== null ? quizAvgScore : 0,
        overallPct,
        learningStatus: roadmapPct > 0 ? `${roadmapPct}%` : 'Not started',
        overallQuizScore: quizAvgScore !== null ? `${quizAvgScore}%` : '—',
        overallCapstone: capstoneScore > 0 ? `${capstoneScore}%` : '—',
        allocationId: m.allocationId || m.allocation_id || m.assignment_id || m.access_id,
        allocation_id: m.allocation_id || m.allocationId || m.assignment_id || m.access_id,
        roadmap_id: m.roadmap_id || m.roadmapId,
        roadmap_title: m.roadmap_title || m.roadmapTitle,
        roadmap_chapters: m.roadmap_chapters || m.roadmapChapters || [],
        completed_nodes: completedNodesCount,
        total_nodes: m.total_nodes !== undefined ? m.total_nodes : m.totalNodes,
        progress: roadmapPct,
        user_quizzes: userQuizzes,
      };
    });
  }, [rawMembers, projectData, isSkillGapOnly, isRoadmapOnly, isBoth]);

  // Dynamic Completion Calculations
  const totalAssigned = members.length;
  const completedCount = members.filter((m) => (m.assessmentStatus || '').toLowerCase() === 'completed').length;
  const inProgressCount = members.filter((m) => (m.assessmentStatus || '').toLowerCase().includes('progress')).length;
  const notStartedCount = members.filter((m) => (m.assessmentStatus || '').toLowerCase().includes('not started') || !m.assessmentStatus).length;

  const completedPct = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
  const inProgressPct = totalAssigned > 0 ? Math.round((inProgressCount / totalAssigned) * 100) : 0;
  const notStartedPct = totalAssigned > 0 ? 100 - completedPct - inProgressPct : 0;

  // Filter and Group Members
  const groupedMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let filtered = members.filter((member) => {
      const matchesSearch =
        !q ||
        (member.name || '').toLowerCase().includes(q) ||
        (member.role || '').toLowerCase().includes(q) ||
        (member.unit || '').toLowerCase().includes(q) ||
        (member.email || '').toLowerCase().includes(q);

      const statusLower = (member.assessmentStatus || '').toLowerCase().replace(/\s+/g, '_');
      const isCompleted = statusLower === 'completed';
      const isInProgress = statusLower.includes('progress');
      const isNotStarted = statusLower.includes('not_started') || !statusLower;
      const hasProgress = (member.overallPct > 0) || (member.roadmapPct > 0) || ((member.quizAvgScore || 0) > 0) || ((member.skillGapScore || 0) > 0);

      let matchesStatus = true;
      if (statusFilter === 'completed') matchesStatus = isCompleted;
      else if (statusFilter === 'in_progress') matchesStatus = isInProgress;
      else if (statusFilter === 'not_started') matchesStatus = isNotStarted;
      else if (statusFilter === 'has_progress') matchesStatus = hasProgress;
      else if (statusFilter === 'no_progress') matchesStatus = !hasProgress;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'progress_desc' || sortBy === 'all') {
        const diffOverall = (b.overallPct || 0) - (a.overallPct || 0);
        if (diffOverall !== 0) return diffOverall;
        const diffRoadmap = (b.roadmapPct || 0) - (a.roadmapPct || 0);
        if (diffRoadmap !== 0) return diffRoadmap;
        const diffQuiz = (b.quizAvgScore || 0) - (a.quizAvgScore || 0);
        if (diffQuiz !== 0) return diffQuiz;
        const diffSG = (b.skillGapScore || 0) - (a.skillGapScore || 0);
        if (diffSG !== 0) return diffSG;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'progress_asc') {
        const diffOverall = (a.overallPct || 0) - (b.overallPct || 0);
        if (diffOverall !== 0) return diffOverall;
        const diffRoadmap = (a.roadmapPct || 0) - (b.roadmapPct || 0);
        if (diffRoadmap !== 0) return diffRoadmap;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'roadmap_desc') {
        const diff = (b.roadmapPct || 0) - (a.roadmapPct || 0);
        if (diff !== 0) return diff;
        return (b.overallPct || 0) - (a.overallPct || 0);
      }
      if (sortBy === 'quiz_desc') {
        const diff = (b.quizAvgScore || 0) - (a.quizAvgScore || 0);
        if (diff !== 0) return diff;
        return (b.overallPct || 0) - (a.overallPct || 0);
      }
      if (sortBy === 'skillgap_desc') {
        const diff = (b.skillGapScore || 0) - (a.skillGapScore || 0);
        if (diff !== 0) return diff;
        return (b.overallPct || 0) - (a.overallPct || 0);
      }
      if (sortBy === 'name_asc' || sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'status') {
        const statusOrder = { 'completed': 1, 'in_progress': 2, 'not_started': 3 };
        const orderA = statusOrder[(a.assessmentStatus || '').toLowerCase().replace(/\s+/g, '_')] || 4;
        const orderB = statusOrder[(b.assessmentStatus || '').toLowerCase().replace(/\s+/g, '_')] || 4;
        if (orderA !== orderB) return orderA - orderB;
        return (b.overallPct || 0) - (a.overallPct || 0);
      }
      return 0;
    });

    const grouped = filtered.reduce((acc, member) => {
      if (!acc[member.unit]) acc[member.unit] = [];
      acc[member.unit].push(member);
      return acc;
    }, {});

    return grouped;
  }, [members, searchQuery, sortBy, statusFilter]);

  const toggleDept = (dept) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [dept]: prev[dept] === undefined ? false : !prev[dept],
    }));
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Header Title */}
        <div className={styles.headerGroup}>
          <div className={styles.categoryTag}>PROJECT</div>
          <h1 className={styles.projectTitle}>{projectName}</h1>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'assigned' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('assigned')}
          >
            Assigned Employees
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'leaderboard' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div className={styles.card}>
              <div className={styles.metaRowTop}>
                <div className={styles.metaColType}>
                  <span className={styles.metaLabel}>Type :</span>
                  <span className={styles.metaValue}>
                    {projectData?.project_details?.project_type || 'Skill gap assessment — each person gets their own roadmap'}
                  </span>
                </div>
                <div className={styles.metaCol}>
                  <span className={styles.metaLabel}>Created by</span>
                  <span className={styles.metaValue}>{createdBy}</span>
                </div>
                <div className={styles.metaCol}>
                  <span className={styles.metaLabel}>Created On</span>
                  <span className={styles.metaValue}>{createdOn}</span>
                </div>
                <div className={styles.metaCol}>
                  <span className={styles.metaLabel}>Assigned</span>
                  <span className={styles.metaValue}>{totalAssigned} people</span>
                </div>
              </div>

              <div className={styles.metaRowBottom}>
                <div className={styles.completedGroup}>
                  <span className={styles.metaLabel}>Completed</span>
                  <div className={styles.completedInner}>
                    <span className={styles.completedCountText}>
                      {completedCount}/{totalAssigned}
                    </span>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${completedPct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className={styles.statusGroup}>
                  <span className={styles.metaLabel}>Status</span>
                  <div className={styles.statusPillBox}>
                    <span className={styles.statusPillText}>
                      {projectData?.project_status?.status
                        ? projectData.project_status.status.charAt(0).toUpperCase() +
                          projectData.project_status.status.slice(1)
                        : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.aboutTitle}>About</h2>
              <p className={styles.aboutText}>
                A skill-gap check rolled out across the wider Organization — covers strategic thinking,
                execution rigor, and cross-functional leadership. Individually tracked across all
                engineers and managers.
              </p>
            </div>
          </>
        )}

        {/* ASSIGNED EMPLOYEES TAB */}
        {activeTab === 'assigned' && (
          <>
            {/* Status Segmented Progress Bar */}
            <div className={styles.statusCard}>
              <h2 className={styles.statusTitle}>Status</h2>
              <div className={styles.multiProgressBar}>
                <div
                  className={styles.segmentCompleted}
                  style={{ width: `${completedPct}%` }}
                ></div>
                <div
                  className={styles.segmentInProgress}
                  style={{ width: `${inProgressPct}%` }}
                ></div>
                <div
                  className={styles.segmentNotStarted}
                  style={{ width: `${notStartedPct}%` }}
                ></div>
              </div>
              <div className={styles.legendRow}>
                <div className={styles.legendItem}>
                  <span className={styles.dotCompleted}></span>
                  <span>
                    {completedCount} completed · {completedPct}%
                  </span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.dotInProgress}></span>
                  <span>
                    {inProgressCount} in progress · {inProgressPct}%
                  </span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.dotNotStarted}></span>
                  <span>
                    {notStartedCount} not started · {notStartedPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className={styles.membersCard}>
              <h2 className={styles.membersHeader}>Members</h2>

              <div className={styles.filterToolbar}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className={styles.selectInput}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort members"
                >
                  <option value="progress_desc">Sort: Highest Progress</option>
                  <option value="progress_asc">Sort: Lowest Progress</option>
                  <option value="roadmap_desc">Sort: Roadmap Progress</option>
                  <option value="quiz_desc">Sort: Quiz Average</option>
                  <option value="skillgap_desc">Sort: Skill Gap Score</option>
                  <option value="name_asc">Sort: Name (A – Z)</option>
                  <option value="name_desc">Sort: Name (Z – A)</option>
                  <option value="status">Sort: Status</option>
                </select>
                <select
                  className={styles.selectInput}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter members"
                >
                  <option value="all">Filter: All Statuses</option>
                  <option value="in_progress">Filter: In Progress</option>
                  <option value="completed">Filter: Completed</option>
                  <option value="not_started">Filter: Not Started</option>
                  <option value="has_progress">Filter: Has Progress (&gt;0%)</option>
                  <option value="no_progress">Filter: No Progress (0%)</option>
                </select>
              </div>

              <div className={styles.membersSubtitle}>
                {isSelfMandate
                  ? '1 person assigned (Self).'
                  : `${totalAssigned} people across organization business units. Expand a group to see individuals.`}
              </div>

              {/* Department Accordions */}
              <div className={styles.accordionList}>
                {Object.keys(groupedMembers).length === 0 ? (
                  <div style={{ padding: '35px 20px', textAlign: 'center', color: '#666', fontSize: '15px', fontWeight: '500' }}>
                    No members match the search and filter criteria.
                  </div>
                ) : (
                  Object.keys(groupedMembers).map((dept) => {
                    const deptMembers = groupedMembers[dept];
                    const deptDone = deptMembers.filter((m) => (m.assessmentStatus || '').toLowerCase() === 'completed').length;
                    const isExpanded = expandedDepts[dept] !== false;

                    return (
                      <div key={dept} className={styles.accordionItem}>
                        <div className={styles.accordionHeader} onClick={() => toggleDept(dept)}>
                          <div className={styles.accordionTitleGroup}>
                            <span className={styles.deptTitle}>{dept}</span>
                            <span className={styles.deptCount}>{deptMembers.length} people</span>
                          </div>
                          <div className={styles.accordionRight}>
                            <span className={styles.deptProgressText}>
                              {deptDone}/{deptMembers.length} done
                            </span>
                            <div className={styles.deptProgressBar}>
                              <div
                                className={styles.deptProgressFill}
                                style={{
                                  width: `${deptMembers.length > 0 ? (deptDone / deptMembers.length) * 100 : 0}%`,
                                }}
                              ></div>
                            </div>
                            <span>{isExpanded ? '▼' : '▶'}</span>
                          </div>
                        </div>

                        {/* Accordion Table */}
                        {isExpanded && (
                          <div className={styles.membersTableWrapper}>
                            <table className={styles.membersTable}>
                              <thead>
                                <tr>
                                  <th>Employee</th>
                                  <th>Status</th>
                                  {(isSkillGapOnly || isBoth) && <th>Skill Gap</th>}
                                  {(isRoadmapOnly || isBoth) && <th>Roadmap</th>}
                                  {(isRoadmapOnly || isBoth) && <th>Quiz Avg</th>}
                                  <th>Overall %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {deptMembers.map((member) => (
                                  <tr key={member.id} onClick={() => setSelectedMember(member)}>
                                    <td>
                                      <div className={styles.userCell}>
                                        <div className={styles.avatarCircle}>
                                          {member.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                          <div className={styles.userName}>{member.name}</div>
                                          <div className={styles.userSubtext}>{member.role}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className={
                                          (member.assessmentStatus || '').toLowerCase() === 'completed'
                                            ? styles.badgeCompleted
                                            : (member.assessmentStatus || '').toLowerCase().includes('progress')
                                            ? styles.badgeInProgress
                                            : styles.badgeNotStarted
                                        }
                                      >
                                        {member.assessmentStatus}
                                      </span>
                                    </td>
                                    {(isSkillGapOnly || isBoth) && (
                                      <td style={{ color: member.skillGapScore !== null ? '#1D6A72' : '#9AA0B4', fontWeight: 600 }}>
                                        {member.skillGapScore !== null ? `${member.skillGapScore}%` : '—'}
                                      </td>
                                    )}
                                    {(isRoadmapOnly || isBoth) && (
                                      <td style={{ color: '#0F1117', fontWeight: 500 }}>
                                        {member.roadmapPct}%
                                      </td>
                                    )}
                                    {(isRoadmapOnly || isBoth) && (
                                      <td style={{ color: member.quizAvgScore !== null ? '#8A6A10' : '#9AA0B4', fontWeight: 600 }}>
                                        {member.quizAvgScore !== null
                                          ? `${member.quizAvgScore}% (${member.learningQuizzesCount}/${member.totalQuizzesCount})`
                                          : '—'}
                                      </td>
                                    )}
                                    <td style={{
                                      fontWeight: 700,
                                      fontSize: '14px',
                                      color: member.overallPct !== null
                                        ? (member.overallPct >= 70 ? '#1D6A72' : member.overallPct >= 40 ? '#8A6A10' : '#C0392B')
                                        : '#9AA0B4'
                                    }}>
                                      {member.overallPct !== null ? `${member.overallPct}%` : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className={styles.membersCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className={styles.membersHeader} style={{ margin: 0 }}>Organization Leaderboard</h2>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Ranked by overall completion and quiz scores</span>
            </div>
            {members.length === 0 ? (
              <div style={{ padding: '35px 20px', textAlign: 'center', color: '#666', fontSize: '15px', fontWeight: '500' }}>
                No members in this project.
              </div>
            ) : (
              <div className={styles.membersTableWrapper}>
                <table className={styles.membersTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Rank</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Status</th>
                      {(isSkillGapOnly || isBoth) && <th>Skill Gap</th>}
                      {(isRoadmapOnly || isBoth) && <th>Roadmap</th>}
                      {(isRoadmapOnly || isBoth) && <th>Quiz Avg</th>}
                      <th>Overall %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...members]
                      .sort((a, b) => {
                        const diffOverall = (b.overallPct || 0) - (a.overallPct || 0);
                        if (diffOverall !== 0) return diffOverall;
                        if (isSkillGapOnly) {
                          return (b.skillGapScore || 0) - (a.skillGapScore || 0);
                        }
                        const diffRoadmap = (b.roadmapPct || 0) - (a.roadmapPct || 0);
                        if (diffRoadmap !== 0) return diffRoadmap;
                        return (b.quizAvgScore || 0) - (a.quizAvgScore || 0);
                      })
                      .map((member, idx) => {
                        const rank = idx + 1;
                        const rankBadge =
                          rank === 1 ? '🥇 #1' : rank === 2 ? '🥈 #2' : rank === 3 ? '🥉 #3' : `#${rank}`;
                        return (
                          <tr key={member.id} onClick={() => setSelectedMember(member)}>
                            <td>
                              <span style={{
                                fontWeight: 700,
                                fontSize: rank <= 3 ? '15px' : '13px',
                                color: rank === 1 ? '#D97706' : rank === 2 ? '#475569' : rank === 3 ? '#B45309' : '#94A3B8'
                              }}>
                                {rankBadge}
                              </span>
                            </td>
                            <td>
                              <div className={styles.userCell}>
                                <div className={styles.avatarCircle}>
                                  {member.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className={styles.userName}>{member.name}</div>
                                  <div className={styles.userSubtext}>{member.role}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ color: '#475569', fontWeight: 500 }}>{member.unit}</td>
                            <td>
                              <span className={
                                (member.assessmentStatus || '').toLowerCase() === 'completed'
                                  ? styles.badgeCompleted
                                  : (member.assessmentStatus || '').toLowerCase().includes('progress')
                                  ? styles.badgeInProgress
                                  : styles.badgeNotStarted
                              }>
                                {member.assessmentStatus}
                              </span>
                            </td>
                            {(isSkillGapOnly || isBoth) && (
                              <td style={{ color: member.skillGapScore !== null ? '#1D6A72' : '#9AA0B4', fontWeight: 600 }}>
                                {member.skillGapScore !== null ? `${member.skillGapScore}%` : '—'}
                              </td>
                            )}
                            {(isRoadmapOnly || isBoth) && (
                              <td style={{ color: '#0F1117', fontWeight: 500 }}>
                                {member.roadmapPct}%
                              </td>
                            )}
                            {(isRoadmapOnly || isBoth) && (
                              <td style={{ color: member.quizAvgScore !== null ? '#8A6A10' : '#9AA0B4', fontWeight: 600 }}>
                                {member.quizAvgScore !== null
                                  ? `${member.quizAvgScore}% (${member.learningQuizzesCount}/${member.totalQuizzesCount})`
                                  : '—'}
                              </td>
                            )}
                            <td style={{
                              fontWeight: 700,
                              fontSize: '14px',
                              color: member.overallPct !== null
                                ? (member.overallPct >= 70 ? '#1D6A72' : member.overallPct >= 40 ? '#8A6A10' : '#C0392B')
                                : '#9AA0B4'
                            }}>
                              {member.overallPct !== null ? `${member.overallPct}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrganization;
