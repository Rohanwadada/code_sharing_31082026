import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';

export const getAllRoadmap = async () => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };
  const response = await axios.post('/all-roadmap', data);

  return response.data;
};

export const getRoadmapById = async (roadmapId) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };
  const response = await axios.get(`/roadmap/${roadmapId}`, data);

  return response.data;
};

export const createRoadmap = async (title, description, level, price, projectId) => {
  const orgContext = getOrgContext();

  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    title: title,
    description: description,
    level: level,
    price: Number(price).toFixed(1),
    project_id: projectId
  };
  const response = await axios.post(`/roadmap`, data);

  return response.data;
};

export const cloneRoadmap = async (
  title,
  description,
  refRoadmapId,
  cloneType,
) => {
  const orgContext = getOrgContext();

  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    title: title,
    description: description,
    ref_rid: refRoadmapId,
    cln_t: cloneType,
  };
  const response = await axios.post(`/roadmap/clone`, data);

  return response.data;
};

export const updateRoadmap = async (roadmapId, data) => {
  const response = await axios.put(`/roadmap/${roadmapId}`, data);

  return response.data;
};

export const deleteRoadmap = async (roadmapId) => {
  const response = await axios.delete(`/roadmap/${roadmapId}`, {});

  return response.data;
};
