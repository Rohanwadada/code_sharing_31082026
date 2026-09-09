import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';
import { useOrganizationStore } from '@/store/organizationStore';
import { useTeamStore } from '@/store/teamStore';

export const saveRoadmapArtifact = async (
  threadId,
  artifactId,
  source,
  messageId = null,
) => {
  const orgContext = getOrgContext();

  const reqData = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    thread_id: threadId,
    source: source,
    message_id: messageId,
  };
  const response = await axios.post(`/artifact/${artifactId}/save`, reqData);

  return response.data;
};

export const getArtifact = async (threadId, artifactId) => {
  const orgContext = getOrgContext();

  const reqData = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    thread_id: threadId,
  };
  const response = await axios.post(`/artifact/${artifactId}`, reqData);

  return response.data;
};

export const getAllSavedRoadmapArtifact = async () => {
  const orgContext = getOrgContext();

  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };
  const response = await axios.post(`/artifact/saved`, data);

  return response.data;
};

export const updateArtifact = async (threadId, artifactId, data) => {
  const orgContext = getOrgContext();

  const reqData = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    thread_id: threadId,
    data: data,
  };
  const response = await axios.put(`/artifact/${artifactId}`, reqData);

  return true;
};
