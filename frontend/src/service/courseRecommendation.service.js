import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';

export const getCourseRecommendation = async (roadmapId, retry = false) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    roadmap_id: roadmapId,
    retry: retry,
  };
  const response = await axios.post('/recommend-course', data);

  return response.data;
};

export const getCourseRecommendationJobStatus = async (jobId, roadmapId) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    job_id: jobId,
    roadmap_id: roadmapId,
  };
  const response = await axios.post('/course-recommendation-status', data);

  return response.data;
};
