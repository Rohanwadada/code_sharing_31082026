import axios from "@/lib/axios"
import { getOrgContext } from "@/lib/orgContext"

const getFunctions = async () => {
  const orgContext = getOrgContext()
  const response = await axios.get(`/organizations/${orgContext.organizationId}/functions`)
  return response.data
}

const getDesignations = async () => {
  const orgContext = getOrgContext()
  const response = await axios.get(`/organizations/${orgContext.organizationId}/designations`)
  return response.data
}

const getDesignationsByFunction = async (functionId) => {
  const response = await axios.get(`/functions/${functionId}/designations`)
  return response.data
}

const createProject = async (projectData, jdFile) => {
  const formData = new FormData()
  formData.append("project_data", JSON.stringify(projectData))
  if (jdFile) formData.append("jd_file", jdFile)
  const response = await axios.post("/create-project", formData)
  return response.data
}

export { getFunctions, getDesignations, getDesignationsByFunction, createProject }
