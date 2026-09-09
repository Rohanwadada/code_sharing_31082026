import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';
import questionGenAxios from '@/lib/question-gen-axios';

export const uploadQuestions = async (data, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('data', JSON.stringify(data));

  const response = await axios.post(
    `/assessment/process-questions-upload`,
    formData,
  );

  return response.data;
};

export const createAssessment = async (data) => {
  const orgContext = getOrgContext();

  const reqData = {
    ...data,
    organization_id: orgContext.organizationId,
  };
  const response = await axios.post(`/assessment`, reqData);

  return response.data;
};

export const updateAssessment = async (assessmentId, data) => {
  const orgContext = getOrgContext();

  const reqData = {
    ...data,
    organization_id: orgContext.organizationId,
  };
  const response = await axios.put(`/assessment/${assessmentId}`, reqData);

  return response.data;
};

export const uploadCompetency = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`/assessment/competency/upload`, formData);

  return response.data;
};

export const generateQuestions = async (data) => {
  const response = await questionGenAxios.post(`/ai/generate`, data);

  return response.data;
};

export const generateCompetency = async (projectId) => {
  const response = await questionGenAxios.post(
    `/competency/jd/generate/${projectId}`,
    {},
  );

  return response.data;
};

export const grantAssessmentAccess = async (data) => {
  const orgContext = getOrgContext();

  const reqData = {
    ...data,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };

  const response = await axios.post(`/assessment/access/grant`, reqData);
  return response.data;
};

export const getImprovementRoadmapInfo = async (assessment_allocation_id) => {

  const response = await axios.get(`/assessment/imr/get-improvement-roadmap/${assessment_allocation_id}`);
  return response.data;
};

export const generateImprovementRoadmap = async (assessment_allocation_id, projectId) => {
  const orgContext = getOrgContext();

  const reqData = {
    allocation_id: assessment_allocation_id,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    project_id: projectId
  };

  const response = await axios.post(`/assessment/imr/generate-roadmap`, reqData);
  return response.data;
};
