import axios from '@/lib/axios';
import { getOrgContext } from '@/lib/orgContext';
import { ThreadType } from '@/utils/thread';

export const sendMessage = async (data, threadType) => {
  const orgContext = getOrgContext();
  const reqData = {
    ...data,
    t: threadType,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };
  const path =
    threadType === ThreadType.ROADMAP_GENERATION
      ? 'roadmap/chat'
      : 'doubt/chat';
  const response = await axios.post(`/thread/${path}?t=${threadType}`, reqData);
  return response.data;
};

export const stopThread = async (threadId, runId) => {
  const reqData = { run_id: runId };
  const response = await axios.post(`/thread/${threadId}/stop`, reqData);
  return response.data;
};

export const updateThread = async (threadId, data) => {
  const orgContext = getOrgContext();
  const reqData = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
    ...data,
  };
  const response = await axios.put(`/thread/${threadId}/update`, reqData);
  return response.data;
};

export const deleteThread = async (threadId) => {
  const reqData = {};
  const response = await axios.delete(`/thread/${threadId}/update`, reqData);
  return response.data;
};

export const getAllUserThread = async (
  threadType = ThreadType.ROADMAP_GENERATION,
) => {
  const orgContext = getOrgContext();
  let path = `/thread/all?t=${threadType}&org=${orgContext.organizationId}`;

  if (orgContext.teamId) {
    path += '&team=${orgContext.teamId';
  }

  const response = await axios.get(path);
  return response.data;
};

export const getThreadMessages = async (threadId) => {
  const orgContext = getOrgContext();
  const reqData = {
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId,
  };
  const response = await axios.post(`/thread/${threadId}/messages`, reqData);
  return response.data;
};

export const sendMessageFeedback = async (threadId, messageId, feedback) => {
  const data = {
    thread_id: threadId,
    message_id: messageId,
    feedback: feedback,
  };
  const response = await axios.post(`/thread/message/feedback`, data);

  return response.data;
};

export const emailRoadmapArtifact = async (threadId, email, file) => {
  const formData = new FormData();
  formData.append('attachment', file);
  formData.append('email', email);
  formData.append('thread_id', threadId);

  const response = await axios.post(`/thread/artifact/email`, formData);

  return response.data;
};
