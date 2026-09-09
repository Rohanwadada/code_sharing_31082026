import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';

export const generateNodeContent = async (data) => {
  const orgContext = getOrgContext();
  const response = await axios.post('/ai/generate-content', {
    ...data,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  });

  return response.data;
};

export const generateRoadmapContentBatch = async (roadmapId, retry = false) => {
  const orgContext = getOrgContext();
  const response = await axios.post('/ai/generate', {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    roadmap_id: roadmapId,
    retry,
  });

  return response.data;
};

export const getContentGenerationStatus = async (roadmapId, jobId) => {
  const orgContext = getOrgContext();
  const response = await axios.post('/ai/content/status', {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    roadmap_id: roadmapId,
    job_id: jobId,
  });

  return response.data;
};


export const generateNodeAssessment = async (data, type=null) => {
  const orgContext = getOrgContext();
  const response = await axios.post(`/learning-assessment/generate?type=${type}`, {
    ...data,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  });

  return response.data;
};
