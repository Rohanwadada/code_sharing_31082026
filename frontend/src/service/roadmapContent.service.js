import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';

export const getNodeContent = async (roadmapId, nodeId) => {
  const orgContext = getOrgContext();
  let path = `/roadmap/${roadmapId}/content/${nodeId}?organization_id=${orgContext.organizationId}`;

  if (orgContext.teamId) {
    path += '&team_id=${orgContext.teamId}';
  }
  const response = await axios.get(path);

  return response.data;
};

export const getRoadmapContent = async (roadmapId) => {
  const orgContext = getOrgContext();
  let path = `/roadmap/${roadmapId}?organization_id=${orgContext.organizationId}`;

  if (orgContext.teamId) {
    path += '&team_id=${orgContext.teamId}';
  }
  const response = await axios.get(path);

  return response.data;
};

export const updateNodeContent = async (roadmapId, nodeId, newContent) => {
  const orgContext = getOrgContext();
  let path = `/roadmap/${roadmapId}/content/${nodeId}?organization_id=${orgContext.organizationId}`;

  if (orgContext.teamId) {
    path += '&team_id=${orgContext.teamId}';
  }
  const response = await axios.put(path, { new_content: newContent });

  return response.data;
};

export const removeNodeContent = async (roadmapId, nodes) => {
  const orgContext = getOrgContext();
  let path = `/roadmap/${roadmapId}/content/remove?organization_id=${orgContext.organizationId}`;

  if (orgContext.teamId) {
    path += '&team_id=${orgContext.teamId}';
  }
  const response = await axios.delete(path, { data: { nodes } });

  return response.data;
};

export const restoreNodeContent = async (roadmapId, nodes) => {
  const orgContext = getOrgContext();
  let path = `/roadmap/${roadmapId}/content/restore?organization_id=${orgContext.organizationId}`;

  if (orgContext.teamId) {
    path += '&team_id=${orgContext.teamId}';
  }
  const response = await axios.post(path, { nodes });

  return response.data;
};

export const notifyContenUpdate = async (roadmapId, subject, nodedetails) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    subject: subject,
    node_details: nodedetails,
  };
  const response = await axios.post(
    `/roadmap/${roadmapId}/content/notify`,
    data,
  );

  return response.data;
};
