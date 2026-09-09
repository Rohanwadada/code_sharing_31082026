import axios from "@/lib/axios";

export const transcribeAudio = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', 'auto');
  formData.append('response_format', 'verbose_json');

  const response = await axios.post(`/tr/transcribe`, formData);

  return response.data;
};
