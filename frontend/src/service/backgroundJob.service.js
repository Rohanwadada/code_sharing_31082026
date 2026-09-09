import axios from '@/lib/axios';

export const addNotification = async (data) => {
  const response = await axios.post(`tn/notify`, data);

  return response.data;
};
