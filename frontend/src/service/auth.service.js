import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useOrganizationStore } from '@/store/organizationStore';

export async function sendOtp(payload) {
  const { data } = await axios.post('/auth/login-request', payload);
  return data;
}
export async function verifyOtp(payload) {
  const { data } = await axios.post('/auth/verify-login', payload);
  return data;
}

export async function logout() {
  try {
    await axios.post('/auth/logout', {});
  } finally {
    useAuthStore.getState().clear();

    window.location.href = '/login';
  }
}

export async function initialize() {
  const store = useAuthStore.getState();
  const organizationStore = useOrganizationStore.getState();

  try {
    const { data } = await axios.get('/user/me');

    store.setUser(data);
    if (data?.organizations.length != 0) {
      organizationStore.setOrganizationId(data?.organizations[0]?.id);
      organizationStore.setOrganizationName(data?.organizations[0]?.name);
    }

    return data;
  } catch (err) {
    store.clear();

    return null;
  }
}
