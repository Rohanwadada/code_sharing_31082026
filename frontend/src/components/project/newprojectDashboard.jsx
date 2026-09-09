'use client';

import React, { useState, useEffect } from 'react';
import classes from './newprojectDashboard.module.css';
import { useRouter } from 'next/navigation';
import { getAllProjects } from '@/service/project.service';

export const PROJECT_TYPES = {
  assessment: 'skill_gap_assessment',
  roadmap: 'roadmap',
  both: 'skill_gap_assessment_and_roadmap',
};

// Icons matching Figma vector specs
const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SearchIcon = () => (
  <svg
    className={classes.searchIcon}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const FilterIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    className={classes.typeVector}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="9 12 11 14 15 10"></polyline>
  </svg>
);

const getInitials = (name) => {
  if (!name) return 'ES';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatDate = (dateString) => {
  if (!dateString) return '2026-08-20';
  try {
    const d = new Date(dateString);
    return d.toISOString().split('T')[0];
  } catch {
    return '2026-08-20';
  }
};

const NewProjectDashboard = () => {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await getAllProjects();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleNewProject = () => {
    router.push('/project/create-project');
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.project_name && p.project_name.toLowerCase().includes(q)) ||
      (p.function_name && p.function_name.toLowerCase().includes(q)) ||
      (p.designation_name && p.designation_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.container}>
        {/* Header */}
        <div className={classes.headerRow}>
          <div>
            <h1 className={classes.title}>Projects</h1>
            <p className={classes.subtitle}>
              Each project pairs a role's job description with a generated
              skill map, its question bank, and the people it is allocated to.
            </p>
          </div>
          <button className={classes.btnNew} onClick={handleNewProject}>
            New <PlusIcon />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className={classes.toolbar}>
          <div className={classes.searchBox}>
            <SearchIcon />
            <input
              type="text"
              className={classes.searchInput}
              placeholder="Search Project"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={classes.filterBtn}>
            <FilterIcon /> Filter
          </button>
        </div>

        {/* Project Cards Grid */}
        <div className={classes.grid}>
          {loading ? (
            <div className={classes.loadingState}>
              <div className={classes.spinner}></div>
              <p>Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className={classes.emptyState}>
              <h3 className={classes.emptyTitle}>No Projects Found</h3>
              <p className={classes.emptySubtitle}>
                {searchQuery
                  ? 'No projects match your search query.'
                  : 'Get started by creating your first project.'}
              </p>
              {!searchQuery && (
                <button className={classes.btnNew} onClick={handleNewProject}>
                  New Project <PlusIcon />
                </button>
              )}
            </div>
          ) : (
            filteredProjects.map((project) => {
              const initials = getInitials(
                project.project_name || project.function_name,
              );
              const statusText =
                typeof project.project_status === 'object'
                  ? project.project_status?.status || 'active'
                  : project.project_status || 'active';

              const createdDate = formatDate(project.created_at);

              return (
                <div key={project.project_id} className={classes.card}>
                  {/* Header Container */}
                  <div className={classes.cardHeader}>
                    <div className={classes.cardHeaderLeft}>
                      <div className={classes.avatar}>
                        <span className={classes.avatarText}>{initials}</span>
                      </div>
                      <div className={classes.cardTitleGroup}>
                        <h3 className={classes.cardTitle}>
                          {project.project_name || 'Devops'}
                        </h3>
                        <p className={classes.cardSubtitle}>
                          Shared by{' '}
                          {project.organization_name || 'Setuschool'} ·{' '}
                          {createdDate}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`${classes.statusPill} ${
                        statusText.toLowerCase() !== 'active'
                          ? classes.statusPillInactive
                          : ''
                      }`}
                    >
                      {statusText}
                    </div>
                  </div>

                  {/* Body Container */}
                  <div className={classes.cardBody}>
                    {/* Type Badge (Skill Gap Assessment) */}
                    <div className={classes.typeBadge}>
                      <CheckCircleIcon />
                      <span className={classes.typeText}>
                        Skill Gap Assessment
                      </span>
                    </div>

                    {/* Inner Wrapper */}
                    <div className={classes.innerWrapper}>
                      {/* Shared Box */}
                      <div className={classes.sharedBox}>
                        Shared with{' '}
                        <span className={classes.sharedBoxBold}>
                          {project.function_name || project.designation_name
                            ? [project.function_name, project.designation_name]
                                .filter(Boolean)
                                .join(' — ')
                            : 'Developer — Developer L2'}
                        </span>
                      </div>

                      {/* Checklist Items */}
                      <div className={classes.checklist}>
                        <div className={classes.checkPill}>
                          <span className={classes.checkPillText}>
                            ✓ 2/3 completed the assessment
                          </span>
                        </div>
                        <div className={classes.checkPill}>
                          <span className={classes.checkPillText}>
                            1 personalised roadmap generated
                          </span>
                        </div>
                      </div>

                      {/* Footnote Note */}
                      <p className={classes.cardNote}>
                        Members: each person who's assessed gets their own
                        personalised roadmap
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NewProjectDashboard;
