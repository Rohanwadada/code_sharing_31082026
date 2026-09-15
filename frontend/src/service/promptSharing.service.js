import axios from "@/lib/axios";

/**
 * Service function to trigger backend Roadmap Prompt generation API.
 * Optimized and reusable across any frontend component.
 *
 * @param {Object} options - Options containing who_is_this_for, what_to_create, role_description_text
 * @param {File|null} file - Optional uploaded PDF file
 * @returns {Promise<Object>} Response data containing prompt, key_insight, competencies, assessment_summary
 */
export const generateRoadmapPrompt = async (options = {}, file = null) => {
  const formData = new FormData();
  
  formData.append("payload", JSON.stringify(options));
  formData.append("who_is_this_for", options.who_is_this_for || "Organization");
  formData.append("what_to_create", options.what_to_create || "roadmap");
  if (options.role_description_text) {
    formData.append("role_description_text", options.role_description_text);
  }
  if (file) {
    formData.append("file", file);
  }

  const response = await axios.post(
    "/prompt-sharing/generate-roadmap-prompt",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};
