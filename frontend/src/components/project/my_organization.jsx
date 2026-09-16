'use client';

import React, { useState, useMemo } from 'react';
import styles from './my_organization.module.css';
import MemberDetailView from './MemberDetailView';

const MyOrganization = ({ projectData }) => {
  const [activeTab, setActiveTab] = useState('assigned'); // 'overview' | 'assigned' | 'leaderboard'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('all');
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
  const createdBy = projectData?.created_by_name || projectData?.organization_name || 'Currently unavailable';
  const createdOn = projectData?.created_at
    ? new Date(projectData.created_at).toLocaleDateString('en-GB')
    : 'Currently unavailable';

  const rawMembers = projectData?.assigned_members || [];

  const members = useMemo(() => {
    return rawMembers.map((m, idx) => ({
      id: m.id || idx + 1,
      name: m.name || m.user_name || 'Currently unavailable',
      email: m.email || 'Currently unavailable',
      role: m.designation || m.role || 'Currently unavailable',
      unit: m.department || m.unit || projectData?.function_name || 'Currently unavailable',
      manager: m.manager || 'Currently unavailable',
      assessmentStatus: m.status || m.assessmentStatus || 'Not started',
      learningStatus: m.progress !== undefined ? `${m.progress}%` : 'Currently unavailable',
      overallQuizScore: m.overallQuizScore || 'Currently unavailable',
      overallCapstone: m.overallCapstone || 'Currently unavailable',
      quizPercent: m.quizPercent || (m.status === 'Completed' ? 100 : m.progress || 0),
      roadmapPercent: m.progress || m.roadmapPercent || 0,
      assessmentPercent: m.assessmentPercent || (m.status === 'Completed' ? 100 : m.progress || 0),
      allocationId: m.allocationId || m.allocation_id || m.assignment_id || m.access_id,
      allocation_id: m.allocation_id || m.allocationId || m.assignment_id || m.access_id,
      roadmap_id: m.roadmap_id || m.roadmapId,
      roadmap_title: m.roadmap_title || m.roadmapTitle,
      roadmap_chapters: m.roadmap_chapters || m.roadmapChapters || [],
      completed_nodes: m.completed_nodes !== undefined ? m.completed_nodes : m.completedNodes,
      total_nodes: m.total_nodes !== undefined ? m.total_nodes : m.totalNodes,
      progress: m.progress !== undefined ? m.progress : 0,
      user_quizzes: m.user_quizzes || [],
      capstone_project: m.capstone_project,
      capstonePercent: m.capstonePercent !== undefined ? m.capstonePercent : (m.capstone_project?.percent || 0),
      capstoneStatus: m.capstoneStatus || m.capstone_project?.status || 'Not started',
      total_quizzes_count: m.total_quizzes_count || (m.user_quizzes || []).length,
      taken_quizzes_count: m.taken_quizzes_count || (m.user_quizzes || []).filter(q => q.status === 'Completed' || q.score > 0).length,
      avg_quiz_score: m.avg_quiz_score,
    }));
  }, [rawMembers, projectData]);

  // Dynamic Completion Calculations
  const totalAssigned = members.length;
  const completedCount = members.filter((m) => m.assessmentStatus === 'Completed').length;
  const inProgressCount = members.filter((m) => m.assessmentStatus === 'In progress').length;
  const notStartedCount = members.filter((m) => m.assessmentStatus === 'Not started').length;

  const completedPct = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
  const inProgressPct = totalAssigned > 0 ? Math.round((inProgressCount / totalAssigned) * 100) : 0;
  const notStartedPct = totalAssigned > 0 ? 100 - completedPct - inProgressPct : 0;

  // Filter and Group Members
  const groupedMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let filtered = members.filter((member) => {
      const matchesSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        member.unit.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && member.assessmentStatus === 'Completed') ||
        (statusFilter === 'in_progress' && member.assessmentStatus === 'In progress') ||
        (statusFilter === 'not_started' && member.assessmentStatus === 'Not started');

      return matchesSearch && matchesStatus;
    });

    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'status') {
      filtered.sort((a, b) => a.assessmentStatus.localeCompare(b.assessmentStatus));
    }

    return filtered.reduce((acc, member) => {
      if (!acc[member.unit]) acc[member.unit] = [];
      acc[member.unit].push(member);
      return acc;
    }, {});
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
                >
                  <option value="all">Sort</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                </select>
                <select
                  className={styles.selectInput}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Filter</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="not_started">Not Started</option>
                </select>
              </div>

              <div className={styles.membersSubtitle}>
                {totalAssigned} people across organization business units. Expand a group to see individuals.
              </div>

              {/* Department Accordions */}
              <div className={styles.accordionList}>
                {Object.keys(groupedMembers).length === 0 ? (
                  <div style={{ padding: '35px 20px', textAlign: 'center', color: '#666', fontSize: '15px', fontWeight: '500' }}>
                    Currently unavailable
                  </div>
                ) : (
                  Object.keys(groupedMembers).map((dept) => {
                    const deptMembers = groupedMembers[dept];
                    const deptDone = deptMembers.filter((m) => m.assessmentStatus === 'Completed').length;
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
                                  <th>Manager</th>
                                  <th>Assessment</th>
                                  <th>Learning Status</th>
                                  <th>Overall Quiz Score</th>
                                  <th>Overall Capstone</th>
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
                                    <td>{member.manager}</td>
                                    <td>
                                      <span
                                        className={
                                          member.assessmentStatus === 'Completed'
                                            ? styles.badgeCompleted
                                            : member.assessmentStatus === 'In progress'
                                            ? styles.badgeInProgress
                                            : styles.badgeNotStarted
                                        }
                                      >
                                        {member.assessmentStatus}
                                      </span>
                                    </td>
                                    <td>{member.learningStatus}</td>
                                    <td>{member.overallQuizScore}</td>
                                    <td>{member.overallCapstone}</td>
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
          <div className={styles.card}>
            <h2 className={styles.aboutTitle}>Organization Leaderboard</h2>
            <p className={styles.aboutText} style={{ marginTop: '12px', color: '#666' }}>
              Currently unavailable
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrganization;
