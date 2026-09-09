import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';

export const grantAccess = async (roadmapId, access, notify = false) => {
  const response = await axios.post('/grant-access', {
    roadmap_id: roadmapId,
    notify,
    access,
  });

  return response.data;
};

export const revokeAccess = async (roadmapId, targetEmails) => {
  const response = await axios.post('/revoke-access', {
    roadmap_id: roadmapId,
    target_emails: targetEmails,
  });

  return response.data;
};

export const getSharedRoadmapData = async (roadmapId) => {
  const response = await axios.get(`/${roadmapId}/access-data`);

  return response.data;
};

export const searchRoadmapByTitle = async (query) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };

  const response = await axios.post(`/search?q=${query}`, data);

  return response.data;
};

export const getAllRoadmap = async () => {
  const orgContext = getOrgContext();
  const response = await axios.post('/all-roadmap', {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  });

  return response.data;
};
