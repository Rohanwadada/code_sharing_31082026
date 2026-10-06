'use client';

import React, { useState } from 'react';
import classes from './CreateSkillGapAssessment.module.css';
import { useRouter } from 'next/navigation';
import { useOrganizationStore } from '@/store/organizationStore';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import axios from '@/lib/axios';

const SERVER_URL = 'http://localhost:8000/api/v1';

const CreateSkillGapAssessment = () => {
  const organizationId = useOrganizationStore((s) => s.organizationId);
  const organizationName = useOrganizationStore((s) => s.organizationName);

  const projectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);
  const setCurrentProjectName = useProjectStore((s) => s.setCurrentProjectName);

  const [projectName, setProjectName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedQBank, setSelectedQBank] = useState('');
  const [fetchedProject, setFetchedProject] = useState(null);
  const [isEditMode] = useState(false);

  // Loading state for the submit button
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const [hiringGoal, setHiringGoal] = useState('');
  const [orgId, setOrgId] = useState(organizationId || '');

  const [functions, setFunctions] = useState([]);
  const [selectedFunctionId, setSelectedFunctionId] = useState('');
  const [selectedFunctionName, setSelectedFunctionName] = useState('');
  const [customFunctionName, setCustomFunctionName] = useState('');

  const [designations, setDesignations] = useState([]);
  const [selectedDesignationId, setSelectedDesignationId] = useState('');
  const [selectedDesignationName, setSelectedDesignationName] = useState('');
  const [customDesignationName, setCustomDesignationName] = useState('');

  const [activeJdOption, setActiveJdOption] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  const [sponsors, setSponsors] = useState([]);
  const [sponsorInput, setSponsorInput] = useState('');
  const [managers, setManagers] = useState([]);
  const [managerInput, setManagerInput] = useState('');
  const [approvalManagers, setApprovalManagers] = useState([]);
  const [approvalInput, setApprovalInput] = useState('');

  const fileInputRef = useRef(null);
  const sponsorInputRef = useRef(null);
  const managerInputRef = useRef(null);
  const approvalInputRef = useRef(null);
  const hasSavedRef = useRef(false);
  const currentFormDataRef = useRef({});

  const handleNext = () => {
    router.push('/review-competency');
  };

  const handleSkipToAllocation = () => {
    // Add logic to skip directly to allocation with the selected Q-Bank
    console.log('Skip to allocation clicked', { selectedQBank });
  };

  const handleSampleJD = () => {
    setJobDescription(
      'This is a sample Job Description for a Product Analyst - L1...\n\nResponsibilities:\n- Analyze market trends\n- Work with engineering teams to deliver features\n- Track and report on product metrics.',
    );
  };

  useEffect(() => {
    currentFormDataRef.current = {
      projectName,
      hiringGoal,
      selectedFunctionId,
      selectedFunctionName,
      customFunctionName,
      selectedDesignationId,
      selectedDesignationName,
      customDesignationName,
      sponsors,
      managers,
      approvalManagers,
      uploadedFile,
      organizationId,
      organizationName,
    };
  }, [
    projectName,
    hiringGoal,
    selectedFunctionId,
    selectedFunctionName,
    customFunctionName,
    selectedDesignationId,
    selectedDesignationName,
    customDesignationName,
    sponsors,
    managers,
    approvalManagers,
    uploadedFile,
    organizationId,
    organizationName,
  ]);

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectDetails = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/project/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId }),
        });

        if (response.ok) {
          const data = await response.json();
          setFetchedProject(data);
          setProjectName(data.project_name || '');
          setHiringGoal(data.hiring_goal || '');

          if (data.project_details) {
            setSponsors(data.project_details.hiring_sponsors || []);
            setManagers(data.project_details.hiring_managers || []);
            setApprovalManagers(data.project_details.approval_managers || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch project details:', error);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  useEffect(() => {
    if (orgId) return;
    const fetchOrgId = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/organizations`);
        const data = await res.json();
        const currentOrg = data.find((o) => o.name === organizationName);
        if (currentOrg) {
          setOrgId(currentOrg.id);
          localStorage.setItem('organizationId', currentOrg.id);
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      }
    };
    if (organizationName) {
      fetchOrgId();
    }
  }, [organizationName, orgId]);

  useEffect(() => {
    if (!orgId) return;

    const fetchFunctions = async () => {
      try {
        const res = await fetch(
          `${SERVER_URL}/organizations/${orgId}/functions`,
        );
        const data = await res.json();
        setFunctions(data);
      } catch (error) {
        console.error('Failed to fetch functions:', error);
      }
    };
    // fetchFunctions();
  }, [orgId]);

  useEffect(() => {
    if (functions.length > 0 && fetchedProject?.function_name) {
      const matchedFunction = functions.find(
        (f) => f.name === fetchedProject.function_name,
      );
      if (matchedFunction) {
        setSelectedFunctionId(matchedFunction.id);
        setSelectedFunctionName(matchedFunction.name);
      } else {
        setSelectedFunctionId('others');
        setCustomFunctionName(fetchedProject.function_name);
      }
    }
  }, [functions, fetchedProject]);

  useEffect(() => {
    if (!selectedFunctionId || selectedFunctionId === 'others') {
      setDesignations([]);
      return;
    }
    const fetchDesignations = async () => {
      try {
        const res = await fetch(
          `${SERVER_URL}/functions/${selectedFunctionId}/designations`,
        );
        const data = await res.json();
        setDesignations(data);
      } catch (error) {
        console.error('Failed to fetch designations:', error);
      }
    };
    fetchDesignations();
  }, [selectedFunctionId]);

  useEffect(() => {
    if (designations.length > 0 && fetchedProject?.designation_name) {
      const matchedDesignation = designations.find(
        (d) => d.name === fetchedProject.designation_name,
      );
      if (matchedDesignation) {
        setSelectedDesignationId(matchedDesignation.id);
        setSelectedDesignationName(matchedDesignation.name);
      } else {
        setSelectedDesignationId('others');
        setCustomDesignationName(fetchedProject.designation_name);
      }
    }
  }, [designations, fetchedProject]);

  const saveProjectToAPI = async (
    targetStatus,
    currentSponsors = sponsors,
    currentManagers = managers,
    currentApprovals = approvalManagers,
  ) => {
    let finalFuncName =
      selectedFunctionId === 'others'
        ? customFunctionName.trim()
        : selectedFunctionName;
    let finalDesigName =
      selectedDesignationId === 'others'
        ? customDesignationName.trim()
        : selectedDesignationName;

    /*  if (targetStatus === "draft") {
      if (selectedFunctionId === "others") finalFuncName = null;
      if (selectedDesignationId === "others") finalDesigName = null;
    } else {
      if (!selectedFunctionId) {
        toast.warn("Please select a Function / SSL.");
        return false;
      }
      if (selectedFunctionId === "others" && !finalFuncName) {
        toast.warn("Please enter a custom Function / SSL name.");
        return false;
      }
      if (!selectedDesignationId) {
        toast.warn("Please select a Designation Level.");
        return false;
      }
      if (selectedDesignationId === "others" && !finalDesigName) {
        toast.warn("Please enter a custom Designation Level name.");
        return false;
      }
    } */

    const projectData = {
      project_name: projectName || 'Untitled Project',
      organization_name: organizationName,
      function_name: finalFuncName || null,
      designation_name: finalDesigName || null,
      hiring_goal: hiringGoal,
      created_by: organizationId || null,
      approval_managers: currentApprovals,
      hiring_sponsors: currentSponsors,
      hiring_managers: currentManagers,
      project_status: { status: targetStatus },
      jd_data: {},
    };

    const formData = new FormData();
    formData.append('project_data', JSON.stringify(projectData));
    if (uploadedFile) formData.append('jd_file', uploadedFile);

    const endpoint = isEditMode
      ? `${SERVER_URL}/projects/${projectId}`
      : `${SERVER_URL}/create-project`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      // const response = await fetch(endpoint, {
      //   method: method,
      //   body: formData,
      // });

      const response = await axios.post(endpoint, formData);
      const responseData = response.data;

      // update store states
      setCurrentProjectId(responseData.project_id);
      setCurrentProjectName(projectName);

      // if (!response.ok) return false;

      hasSavedRef.current = true;
      if (isEditMode) localStorage.removeItem('project_id');
      return responseData;
    } catch (error) {
      console.error('Error submitting form:', error);
      return null;
    }
  };

  const handleBlur = (type) => {
    if (type === 'sponsor' && sponsorInput.trim()) {
      if (!sponsors.includes(sponsorInput.trim())) {
        setSponsors([...sponsors, sponsorInput.trim()]);
      }
      setSponsorInput('');
    } else if (type === 'manager' && managerInput.trim()) {
      if (!managers.includes(managerInput.trim())) {
        setManagers([...managers, managerInput.trim()]);
      }
      setManagerInput('');
    } else if (type === 'approval' && approvalInput.trim()) {
      if (!approvalManagers.includes(approvalInput.trim())) {
        setApprovalManagers([...approvalManagers, approvalInput.trim()]);
      }
      setApprovalInput('');
    }
  };

  const handleTagClick = (tagToEdit, type) => {
    if (type === 'sponsor') {
      let currentTags = [...sponsors];
      if (sponsorInput.trim()) {
        if (!currentTags.includes(sponsorInput.trim())) {
          currentTags.push(sponsorInput.trim());
        }
      }
      currentTags = currentTags.filter((t) => t !== tagToEdit);
      setSponsors(currentTags);
      setSponsorInput(tagToEdit);
      setTimeout(() => sponsorInputRef.current?.focus(), 0);
    } else if (type === 'manager') {
      let currentTags = [...managers];
      if (managerInput.trim()) {
        if (!currentTags.includes(managerInput.trim())) {
          currentTags.push(managerInput.trim());
        }
      }
      currentTags = currentTags.filter((t) => t !== tagToEdit);
      setManagers(currentTags);
      setManagerInput(tagToEdit);
      setTimeout(() => managerInputRef.current?.focus(), 0);
    } else if (type === 'approval') {
      let currentTags = [...approvalManagers];
      if (approvalInput.trim()) {
        if (!currentTags.includes(approvalInput.trim())) {
          currentTags.push(approvalInput.trim());
        }
      }
      currentTags = currentTags.filter((t) => t !== tagToEdit);
      setApprovalManagers(currentTags);
      setApprovalInput(tagToEdit);
      setTimeout(() => approvalInputRef.current?.focus(), 0);
    }
  };

  const autoSaveDraftOnLeave = () => {
    const currentData = currentFormDataRef.current;
    if (
      isEditMode ||
      hasSavedRef.current ||
      (!currentData.projectName.trim() && !currentData.hiringGoal.trim())
    ) {
      return;
    }

    let finalFuncName =
      currentData.selectedFunctionId === 'others'
        ? null
        : currentData.selectedFunctionName;
    let finalDesigName =
      currentData.selectedDesignationId === 'others'
        ? null
        : currentData.selectedDesignationName;

    const projectData = {
      project_name: currentData.projectName || 'Untitled Project',
      organization_name: organizationName,
      function_name: finalFuncName || null,
      designation_name: finalDesigName || null,
      hiring_goal: currentData.hiringGoal,
      created_by: organizationId,
      approval_managers: currentData.approvalManagers,
      hiring_sponsors: currentData.sponsors,
      hiring_managers: currentData.managers,
      project_status: { status: 'draft' },
      jd_data: {},
    };

    const formData = new FormData();
    formData.append('project_data', JSON.stringify(projectData));
    if (currentData.uploadedFile)
      formData.append('jd_file', currentData.uploadedFile);

    fetch(`${SERVER_URL}/create-project`, {
      method: 'POST',
      body: formData,
      keepalive: true,
    }).catch((e) => console.error('Auto-save failed', e));

    hasSavedRef.current = true;
  };

  useEffect(() => {
    const handleBeforeUnload = () => autoSaveDraftOnLeave();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleFunctionChange = (e) => {
    const fId = e.target.value;
    setSelectedFunctionId(fId);
    if (fId === 'others') {
      setSelectedFunctionName('');
    } else {
      setSelectedFunctionName(functions.find((f) => f.id === fId)?.name || '');
    }
    setSelectedDesignationId('');
    setSelectedDesignationName('');
    setCustomDesignationName('');
  };

  const handleDesignationChange = (e) => {
    const dId = e.target.value;
    setSelectedDesignationId(dId);
    if (dId === 'others') {
      setSelectedDesignationName('');
    } else {
      setSelectedDesignationName(
        designations.find((d) => d.id === dId)?.name || '',
      );
    }
  };

  const handleKeyDown = (e, type) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (type === 'sponsor' && sponsorInput.trim()) {
        if (!sponsors.includes(sponsorInput.trim()))
          setSponsors([...sponsors, sponsorInput.trim()]);
        setSponsorInput('');
      } else if (type === 'manager' && managerInput.trim()) {
        if (!managers.includes(managerInput.trim()))
          setManagers([...managers, managerInput.trim()]);
        setManagerInput('');
      } else if (type === 'approval' && approvalInput.trim()) {
        if (!approvalManagers.includes(approvalInput.trim()))
          setApprovalManagers([...approvalManagers, approvalInput.trim()]);
        setApprovalInput('');
      }
    } else if (e.key === 'Backspace') {
      if (type === 'sponsor' && !sponsorInput && sponsors.length > 0) {
        e.preventDefault();
        const lastTag = sponsors[sponsors.length - 1];
        setSponsors(sponsors.slice(0, -1));
        setSponsorInput(lastTag);
      } else if (type === 'manager' && !managerInput && managers.length > 0) {
        e.preventDefault();
        const lastTag = managers[managers.length - 1];
        setManagers(managers.slice(0, -1));
        setManagerInput(lastTag);
      } else if (
        type === 'approval' &&
        !approvalInput &&
        approvalManagers.length > 0
      ) {
        e.preventDefault();
        const lastTag = approvalManagers[approvalManagers.length - 1];
        setApprovalManagers(approvalManagers.slice(0, -1));
        setApprovalInput(lastTag);
      }
    }
  };

  const removeTag = (tagToRemove, type) => {
    if (type === 'sponsor')
      setSponsors(sponsors.filter((tag) => tag !== tagToRemove));
    else if (type === 'manager')
      setManagers(managers.filter((tag) => tag !== tagToRemove));
    else if (type === 'approval')
      setApprovalManagers(
        approvalManagers.filter((tag) => tag !== tagToRemove),
      );
  };

  const handleJdCardClick = (option) => {
    setActiveJdOption(option);
    if (option === 'upload' || option === 'existing')
      fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setUploadedFile(file);
    e.target.value = null;
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setActiveJdOption('draft');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.warn('Project Name is required.');
      return;
    }
    if (!uploadedFile) {
      toast.warn('Jd file is required.');
      return;
    }

    let finalSponsors = [...sponsors];
    if (sponsorInput.trim() && !finalSponsors.includes(sponsorInput.trim())) {
      finalSponsors.push(sponsorInput.trim());
    }
    let finalManagers = [...managers];
    if (managerInput.trim() && !finalManagers.includes(managerInput.trim())) {
      finalManagers.push(managerInput.trim());
    }
    let finalApprovals = [...approvalManagers];
    if (
      approvalInput.trim() &&
      !finalApprovals.includes(approvalInput.trim())
    ) {
      finalApprovals.push(approvalInput.trim());
    }

    setIsSubmitting(true);
    try {
      const response = await saveProjectToAPI(
        'active',
        finalSponsors,
        finalManagers,
        finalApprovals,
      );
      if (response) {
        router.push(
          `/project/${response.project_id}/assessment/assessment-types`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      if (projectName.trim() || hiringGoal.trim()) {
        let finalSponsors = [...sponsors];
        if (
          sponsorInput.trim() &&
          !finalSponsors.includes(sponsorInput.trim())
        ) {
          finalSponsors.push(sponsorInput.trim());
        }
        let finalManagers = [...managers];
        if (
          managerInput.trim() &&
          !finalManagers.includes(managerInput.trim())
        ) {
          finalManagers.push(managerInput.trim());
        }
        let finalApprovals = [...approvalManagers];
        if (
          approvalInput.trim() &&
          !finalApprovals.includes(approvalInput.trim())
        ) {
          finalApprovals.push(approvalInput.trim());
        }
        await saveProjectToAPI(
          'draft',
          finalSponsors,
          finalManagers,
          finalApprovals,
        );
      } else {
        hasSavedRef.current = true;
      }

      localStorage.removeItem('project_id');
      router.push('/projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <h1 className={classes.pageTitle}>Create a skill-gap assessment</h1>
        <p className={classes.pageSubtitle}>
          Each project pairs a role's job description with a generated skill
          map, its question bank, and the people it is allocated to.
        </p>
      </div>

      {/* Main Creation Card */}
      {/* <div className={classes.card}>
        <div className={classes.formGroup}>
          <label className={classes.label}>Project Name / Role</label>
          <input 
            type="text" 
            className={classes.input} 
            placeholder="eg: Product Analyst – L1"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>
        
        <div className={classes.formGroup}>
          <label className={classes.label}>Organization Name</label>
          <input 
            type="text" 
            className={classes.input} 
            placeholder="eg: SETU"
            value={organizationName}
            // onChange={(e) => setProjectName(e.target.value)}
            readOnly
            disabled
          />
        </div>

        <div className={classes.formGroup}>
          <label className={classes.label}>Job Description</label>
          <textarea 
            className={classes.textarea} 
            placeholder="Paste the JD, or use the sample below"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          ></textarea>
        </div>

        <div className={classes.actionRow}>
          <p className={classes.sampleText}>
            or <button type="button" className={classes.sampleLink} onClick={handleSampleJD}>Use a sample JD</button> to try the flow.
          </p>
          <button 
            className={classes.nextBtn} 
            onClick={handleNext}
            disabled={!projectName || !jobDescription}
          >
            Next <span className={classes.arrowIcon}>→</span>
          </button>
        </div>
      </div>*/}

      <form
        className={`${classes['form-body']} ${classes['card']}`}
        onSubmit={(e) => e.preventDefault()}
      >
        <div className={classes['form-group']}>
          <label className={classes['label']}>PROJECT NAME</label>
          <input
            type="text"
            className={classes['input']}
            placeholder="e.g. Tax Senior Analyst — Q3 Hiring"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
        </div>

        <div className={classes['form-group']}>
          <label className={classes['label']}>ORGANIZATION NAME</label>
          <input
            type="text"
            className={classes['input']}
            value={organizationName}
            disabled
            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </div>

        {/* <div className={classes['form-row']}>
          <div className={classes['form-group']}>
            <label className={classes['label']}>FUNCTION / SSL</label>
            <select
              className={classes['select']}
              value={selectedFunctionId}
              onChange={handleFunctionChange}
            >
              <option value="" disabled>
                Select Function
              </option>
              {functions.map((func) => (
                <option key={func.id} value={func.id}>
                  {func.name}
                </option>
              ))}
              <option value="others">Others</option>
            </select>
            {selectedFunctionId === 'others' && (
              <input
                type="text"
                className={classes['input']}
                style={{ marginTop: '10px' }}
                placeholder="Enter custom function"
                value={customFunctionName}
                onChange={(e) => setCustomFunctionName(e.target.value)}
              />
            )}
          </div>

          <div className={classes['form-group']}>
            <label className={classes['label']}>DESIGNATION LEVEL</label>
            <select
              className={classes['select']}
              value={selectedDesignationId}
              onChange={handleDesignationChange}
              disabled={!selectedFunctionId}
            >
              <option value="" disabled>
                Select Level
              </option>
              {designations.map((desig) => (
                <option key={desig.id} value={desig.id}>
                  {desig.name}
                </option>
              ))}
              <option value="others">Others</option>
            </select>
            {selectedDesignationId === 'others' && (
              <input
                type="text"
                className={classes['input']}
                style={{ marginTop: '10px' }}
                placeholder="Enter custom designation"
                value={customDesignationName}
                onChange={(e) => setCustomDesignationName(e.target.value)}
              />
            )}
          </div>
        </div> */}

        {/* <div className={classes['form-group']}>
          <label className={classes['label']}>HIRING GOAL</label>
          <textarea
            className={classes['textarea']}
            placeholder="What does success look like for this hire?"
            rows="3"
            value={hiringGoal}
            onChange={(e) => setHiringGoal(e.target.value)}
          ></textarea>
        </div> */}

        {/* <div className={classes['form-group']}>
          <label className={classes['label']}>HIRING SPONSOR </label>
          <div
            className={classes['tag-input-box']}
            onClick={() => sponsorInputRef.current?.focus()}
          >
            {sponsors.map((tag) => (
              <span
                key={tag}
                className={classes['tag']}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagClick(tag, 'sponsor');
                }}
              >
                {tag}
                <button
                  type="button"
                  className={classes['close-tag']}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag, 'sponsor');
                  }}
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              ref={sponsorInputRef}
              type="text"
              name="unique_sponsor_field"
              autoComplete="new-sponsor-email"
              className={classes['embedded-input']}
              placeholder={sponsors.length === 0 ? 'Add hiring sponsers' : ''}
              value={sponsorInput}
              onChange={(e) => setSponsorInput(e.target.value)}
              onBlur={() => handleBlur('sponsor')}
              onKeyDown={(e) => handleKeyDown(e, 'sponsor')}
            />
          </div>
        </div> */}

        {/* <div className={classes['form-group']}>
          <label className={classes['label']}>HIRING MANAGER </label>
          <div
            className={classes['tag-input-box']}
            onClick={() => managerInputRef.current?.focus()}
          >
            {managers.map((tag) => (
              <span
                key={tag}
                className={classes['tag']}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagClick(tag, 'manager');
                }}
              >
                {tag}
                <button
                  type="button"
                  className={classes['close-tag']}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag, 'manager');
                  }}
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              ref={managerInputRef}
              type="text"
              name="unique_manager_field"
              autoComplete="new-manager-email"
              className={classes['embedded-input']}
              placeholder={managers.length === 0 ? 'Add hiring managers' : ''}
              value={managerInput}
              onChange={(e) => setManagerInput(e.target.value)}
              onBlur={() => handleBlur('manager')}
              onKeyDown={(e) => handleKeyDown(e, 'manager')}
            />
          </div>
        </div> */}

        {/* <div className={classes['form-group']}>
          <label className={classes['label']}>APPROVAL MANAGER </label>
          <div
            className={classes['tag-input-box']}
            onClick={() => approvalInputRef.current?.focus()}
          >
            {approvalManagers.map((tag) => (
              <span
                key={tag}
                className={classes['tag']}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagClick(tag, 'approval');
                }}
              >
                {tag}
                <button
                  type="button"
                  className={classes['close-tag']}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag, 'approval');
                  }}
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              ref={approvalInputRef}
              type="text"
              name="unique_approval_field"
              autoComplete="new-approval-email"
              className={classes['embedded-input']}
              placeholder={
                approvalManagers.length === 0 ? 'Add approval manager' : ''
              }
              value={approvalInput}
              onChange={(e) => setApprovalInput(e.target.value)}
              onBlur={() => handleBlur('approval')}
              onKeyDown={(e) => handleKeyDown(e, 'approval')}
            />
          </div>
        </div> */}

        <div className={classes['form-group']}>
          <label className={classes['label']}>JOB DESCRIPTION</label>
          <div className={classes['jd-cards']}>
            <div
              className={`${classes['jd-card']} ${
                activeJdOption === 'upload' ? classes['active'] : ''
              }`}
              onClick={() => handleJdCardClick('upload')}
            >
              <span className={classes['card-icon']}>📁</span>
              <p className={classes['card-title']}>Upload JD</p>
            </div>
          </div>
          <input
            type="file"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
            required
          />
          {uploadedFile && (
            <div className={classes['uploaded-file-container']}>
              <div className={classes['file-tag']}>
                <span>{uploadedFile.name.replace(/\.[^/.]+$/, '')}</span>
                <button
                  type="button"
                  className={classes['remove-file']}
                  onClick={removeUploadedFile}
                >
                  &times;
                </button>
              </div>
            </div>
          )}
          {isEditMode && fetchedProject?.jd_url && !uploadedFile && (
            <div
              style={{
                marginTop: '10px',
                fontSize: '14px',
                color: '#3A3F50',
              }}
            >
              Current JD:{' '}
              <a
                href={fetchedProject.jd_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#C9A84C', textDecoration: 'underline' }}
              >
                View Document
              </a>
            </div>
          )}
        </div>

        <div className={classes['form-actions']}>
          {/* <button
            type="button"
            className={classes['btn-outline']}
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>*/}

          <button
            type="button"
            className={classes.nextBtn}
            onClick={handleSubmit}
            disabled={isSubmitting || !projectName || !uploadedFile}
          >
            {isSubmitting ? (
              <span
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
                {isEditMode ? 'Updating...' : 'Saving...'}
              </span>
            ) : isEditMode ? (
              'Update Project'
            ) : (
              'Next'
            )}

            {!isSubmitting && <span className={classes.arrowIcon}>→</span>}
          </button>
        </div>
      </form>

      {/* Map to Existing Q-Bank Card */}
      <div className={classes.card}>
        <h2 className={classes.cardTitle}>Map to an existing question bank</h2>
        <p className={classes.cardSubtitle}>
          Already have a skill map and question set for this role? Reuse it — no
          re-extraction, no regeneration.
        </p>

        <div className={classes.selectWrapper}>
          <select
            className={classes.select}
            value={selectedQBank}
            onChange={(e) => setSelectedQBank(e.target.value)}
          >
            <option value="" disabled>
              Choose the existing Q- bank
            </option>
            <option value="qbank1">Engineering L1 - Core Basics</option>
            <option value="qbank2">Data Science - Mid Level</option>
          </select>
          <svg
            className={classes.selectChevron}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <button className={classes.skipBtn} onClick={handleSkipToAllocation}>
          Use this question bank <span className={classes.arrowIcon}>→</span>{' '}
          Skip to allocation
        </button>
      </div>
    </div>
  );
};

export default CreateSkillGapAssessment;
