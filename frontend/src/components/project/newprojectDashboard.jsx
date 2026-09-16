'use client';

import React, { useState, useEffect, useRef } from 'react';
import classes from './newprojectDashboard.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from '@/lib/axios';
//change_by_rohan
import { getOrgContext } from '@/lib/orgContext';
import { useAuthStore } from '@/store/authStore';

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

const SortIcon = () => (
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
    <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"></path>
  </svg>
);

//change_by_rohan (Icons for dynamic project types with exact Figma dimensions width="12" height="12")
const AssessmentIcon = () => (
  <svg
    width="12"
    height="12"
    className={classes.typeVector}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const RoadmapIcon = () => (
  <svg
    width="12"
    height="12"
    className={classes.typeVector}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

const BothIcon = () => (
  <svg
    width="12"
    height="12"
    className={classes.typeVector}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    width="12"
    height="12"
    className={classes.typeVector}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const getInitials = (name) => {
  if (!name) return 'PR';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
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
  const searchParams = useSearchParams();
  const mandateParam = searchParams ? searchParams.get('mandate') : null;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Filter & Sort States
  const [sortOption, setSortOption] = useState('latest');
  const [typeFilter, setTypeFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filterRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const orgContext = getOrgContext();
        let url = '/get-all-projects';
        if (orgContext?.organizationId) {
          url += `?organization_id=${orgContext.organizationId}`;
        }
        const response = await axios.get(url);
        setProjects(Array.isArray(response.data) ? response.data : []);
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

  const availableDesignations = Array.from(
    new Set(projects.map((p) => p.designation_name).filter(Boolean)),
  );

  const activeFiltersCount =
    (typeFilter !== 'all' ? 1 : 0) + (designationFilter !== 'all' ? 1 : 0);

  const filteredProjects = projects
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (p.project_name && p.project_name.toLowerCase().includes(q)) ||
        (p.function_name && p.function_name.toLowerCase().includes(q)) ||
        (p.designation_name && p.designation_name.toLowerCase().includes(q));

      const pType = p.project_details?.project_type || 'skill_gap_assessment';
      const matchesType = typeFilter === 'all' || pType === typeFilter;

      const matchesDesignation =
        designationFilter === 'all' || p.designation_name === designationFilter;

      const pMandate = p.project_details?.project_mandate;
      const matchesMandate =
        !mandateParam ||
        (mandateParam === 'organization' && (pMandate === 'organization' || !pMandate)) ||
        (mandateParam === 'team' && pMandate === 'team') ||
        (mandateParam === 'self' && pMandate === 'self');

      return matchesSearch && matchesType && matchesDesignation && matchesMandate;
    })
    .sort((a, b) => {
      if (sortOption === 'latest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      } else if (sortOption === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      } else if (sortOption === 'a-z') {
        return (a.project_name || '').localeCompare(b.project_name || '');
      } else if (sortOption === 'z-a') {
        return (b.project_name || '').localeCompare(a.project_name || '');
      }
      return 0;
    });

  const getProjectTypeBadge = (project) => {
    const pType = project.project_details?.project_type || 'skill_gap_assessment';
    if (pType === 'roadmap') {
      return {
        label: 'Roadmap',
        badgeClass: classes.typeBadgeRoadmap,
        Icon: RoadmapIcon,
      };
    } else if (pType === 'skill_gap_assessment_and_roadmap') {
      return {
        label: 'Skill Gap & Roadmap',
        badgeClass: classes.typeBadgeBoth,
        Icon: BothIcon,
      };
    }
    return {
      label: 'Skill Gap Assessment',
      badgeClass: classes.typeBadgeAssessment,
      Icon: AssessmentIcon,
    };
  };

  const getSharedWithText = (project) => {
    const mandate = project.project_details?.project_mandate;
    if (mandate === 'organization') return 'Organization';
    if (mandate === 'team') return 'Team';
    if (mandate === 'self') return 'Self';
    return 'Organization';
  };

  let pageTitle = 'Projects';
  let pageSubtitle =
    "Each project pairs a role's job description with a generated skill map, its question bank, and the people it is allocated to.";

  if (mandateParam === 'organization') {
    pageTitle = 'My Organisation';
    pageSubtitle =
      "Every project shared with your organisation — the role's skill map, question bank, and allocations.";
  } else if (mandateParam === 'team') {
    pageTitle = 'My Team';
    pageSubtitle =
      "Every project shared with your team — the role's skill map, question bank, and allocations.";
  }

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.container}>
        {/* Header */}
        <div className={classes.headerRow}>
          <div>
            <h1 className={classes.title}>{pageTitle}</h1>
            <p className={classes.subtitle}>{pageSubtitle}</p>
          </div>
          {!mandateParam && (
            <button className={classes.btnNew} onClick={handleNewProject}>
              <PlusIcon /> Create New Project
            </button>
          )}
        </div>

        {/* Search, Sort & Filter Toolbar */}
        <div className={classes.toolbar}>
          <div className={classes.searchBox}>
            <SearchIcon />
            <input
              type="text"
              className={classes.searchInput}
              placeholder="Search Project by name, function or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={classes.toolbarActions}>
            <div className={classes.dropdownContainer} ref={sortRef}>
              <button
                className={classes.filterBtn}
                onClick={() => {
                  setIsSortOpen(!isSortOpen);
                  setIsFilterOpen(false);
                }}
              >
                <SortIcon />
                {sortOption === 'latest' && 'Latest First'}
                {sortOption === 'oldest' && 'Oldest First'}
                {sortOption === 'a-z' && 'A to Z'}
                {sortOption === 'z-a' && 'Z to A'}
              </button>
              {isSortOpen && (
                <div className={classes.dropdownMenu}>
                  <button
                    className={`${classes.dropdownOption} ${sortOption === 'latest' ? classes.dropdownOptionActive : ''
                      }`}
                    onClick={() => { setSortOption('latest'); setIsSortOpen(false); }}
                  >
                    Date: Latest First
                  </button>
                  <button
                    className={`${classes.dropdownOption} ${sortOption === 'oldest' ? classes.dropdownOptionActive : ''
                      }`}
                    onClick={() => { setSortOption('oldest'); setIsSortOpen(false); }}
                  >
                    Date: Oldest First
                  </button>
                  <button
                    className={`${classes.dropdownOption} ${sortOption === 'a-z' ? classes.dropdownOptionActive : ''
                      }`}
                    onClick={() => { setSortOption('a-z'); setIsSortOpen(false); }}
                  >
                    Name: A to Z
                  </button>
                  <button
                    className={`${classes.dropdownOption} ${sortOption === 'z-a' ? classes.dropdownOptionActive : ''
                      }`}
                    onClick={() => { setSortOption('z-a'); setIsSortOpen(false); }}
                  >
                    Name: Z to A
                  </button>
                </div>
              )}
            </div>

            <div className={classes.dropdownContainer} ref={filterRef}>
              <button
                className={classes.filterBtn}
                onClick={() => {
                  setIsFilterOpen(!isFilterOpen);
                  setIsSortOpen(false);
                }}
              >
                <FilterIcon /> Filter
                {activeFiltersCount > 0 && (
                  <span className={classes.activeBadge}>{activeFiltersCount}</span>
                )}
              </button>
              {isFilterOpen && (
                <div className={classes.filterMenu}>
                  <div>
                    <p className={classes.filterSectionTitle}>Project Type</p>
                    <select
                      className={classes.filterSelect}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All Project Types</option>
                      <option value="skill_gap_assessment">Skill Gap Assessment</option>
                      <option value="roadmap">Roadmap</option>
                      <option value="skill_gap_assessment_and_roadmap">Skill Gap & Roadmap</option>
                    </select>
                  </div>
                  <div>
                    <p className={classes.filterSectionTitle}>Designation</p>
                    <select
                      className={classes.filterSelect}
                      value={designationFilter}
                      onChange={(e) => setDesignationFilter(e.target.value)}
                    >
                      <option value="all">All Designations</option>
                      {availableDesignations.map((desig) => (
                        <option key={desig} value={desig}>{desig}</option>
                      ))}
                    </select>
                  </div>
                  {(typeFilter !== 'all' || designationFilter !== 'all') && (
                    <button
                      className={classes.resetFilterBtn}
                      onClick={() => { setTypeFilter('all'); setDesignationFilter('all'); }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
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
                {searchQuery || activeFiltersCount > 0
                  ? 'No projects match your active search and filter criteria.'
                  : 'Get started by creating your first project.'}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  className={classes.resetFilterBtn}
                  onClick={() => { setSearchQuery(''); setTypeFilter('all'); setDesignationFilter('all'); }}
                >
                  Clear All Filters
                </button>
              )}
              {!searchQuery && activeFiltersCount === 0 && !mandateParam && (
                <button className={classes.btnNew} onClick={handleNewProject}>
                  New Project <PlusIcon />
                </button>
              )}
            </div>
          ) : (
            filteredProjects.map((project) => {
              const initials = getInitials(project.project_name || project.function_name);
              const statusText = typeof project.project_status === 'object'
                ? project.project_status?.status || 'active'
                : project.project_status || 'active';
              const createdDate = formatDate(project.created_at);
              const { label: typeLabel, badgeClass, Icon: TypeIcon } = getProjectTypeBadge(project);

              return (
                <div
                  key={project.project_id}
                  className={classes.card}
                  onClick={() => router.push(`/project/${project.project_id}`)}
                >
                  <div className={classes.cardHeader}>
                    <div className={classes.cardHeaderLeft}>
                      <div className={classes.avatar}>
                        <span className={classes.avatarText}>{initials}</span>
                      </div>
                      <div className={classes.cardTitleGroup}>
                        <h3 className={classes.cardTitle}>{project.project_name || 'Project'}</h3>
                        <p className={classes.cardSubtitle}>
                          Shared by {project.organization_name || 'Organization'} · {createdDate}
                        </p>
                      </div>
                    </div>
                    <div className={`${classes.statusPill} ${statusText.toLowerCase() !== 'active' ? classes.statusPillInactive : ''}`}>
                      {statusText}
                    </div>
                  </div>

                  <div className={classes.cardBody}>
                    <div className={badgeClass}>
                      <TypeIcon />
                      <span className={classes.typeText}>{typeLabel}</span>
                    </div>

                    <div className={classes.innerWrapper}>
                      <div className={classes.sharedBox}>
                        Shared with{' '}
                        <span className={classes.sharedBoxBold}>
                          {getSharedWithText(project)}
                        </span>
                      </div>

                      <div className={classes.cardFooter}>
                        <button
                          className={classes.openProjectBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/project/${project.project_id}`);
                          }}
                        >
                          Open Project ↗
                        </button>
                      </div>
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
