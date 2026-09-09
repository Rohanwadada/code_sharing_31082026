import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';

export const searchRoadmapSnippets = async (query, roadmapId) => {
  const orgContext = getOrgContext();
  const data = {
    query,
    organization_id: orgContext.organizationId,
    roadmap_id: roadmapId,
  };
  const response = await axios.post('/roadmap-blocks/search', data);

  return response.data;
};

export const addSnippetToRoadmap = async (roadmapId, snippet, refRid) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    snippet,
    ref_rid: refRid,
  };
  const response = await axios.post(
    `/roadmap-blocks/add-snippet/${roadmapId}`,
    data,
  );

  return response.data;
};

export const addComponentToBag = async (component) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    component,
  };
  const response = await axios.post('/roadmap-blocks/add-component', data);

  return response.data;
};

export const getComponents = async () => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };
  const response = await axios.post('/roadmap-blocks/get-components', data);

  return response.data;
};

export const removeComponentFromBag = async (component) => {
  const orgContext = getOrgContext();
  const data = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    component,
  };
  const response = await axios.post('/roadmap-blocks/remove-component', data);

  return response.data;
};
