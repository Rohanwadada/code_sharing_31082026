import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';

export const getLearningProgress = async (roadmapId) => {
  const orgContext = getOrgContext();

  let path = `/learning-progress/${roadmapId}?organization_id=${orgContext.organizationId}`;
  if (orgContext.teamId) {
    path += '&team_id=${orgContext.teamId}';
  }
  const response = await axios.get(path);
  return response.data;
};

export const updateLearningProgress = async (roadmapId, data) => {
  const orgContext = getOrgContext();
  let path = `/learning-progress/${roadmapId}?organization_id=${orgContext.organizationId}`;
  if (orgContext.teamId) {
    path += '&team_id=${orgContext.teamId}';
  }

  const response = await axios.put(path, data);

  return response.data;
};
