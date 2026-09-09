import axios from "@/lib/axios"
import { getOrgContext } from "@/lib/orgContext"

export const getExamDetails = async(data) => {
  const orgContext = getOrgContext()

  const reqData = {
    ...data,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId
  }
  const response = await axios.post('/exam/details', reqData)

  return response.data
}

export const allocateExam = async(data) => {
  const orgContext = getOrgContext()

  const reqData = {
    ...data,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId
  }
  const response = await axios.post('/exam/allocate', reqData)

  return response.data
}

export const evaluateExam = async(data) => {
  const orgContext = getOrgContext()

  const reqData = {
    ...data,
    organization_id: orgContext.organizationId,
    team_id: orgContext.teamId
  }
  const response = await axios.post('/exam/evaluate', reqData)

  return response.data
}

export const getExamResult = async(allocationId) => {
  const response = await axios.get(`/exam/get-result/${allocationId}`)

  return response.data
}

export const getAllUserAssessment = async() => {
  const response = await axios.get(`/assessment/access/get-all-assessments`)

  return response.data
}
