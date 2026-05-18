import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.error || error.message;
    if (status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      location.href = '/login';
    } else if (status >= 500) {
      toast.error('Erro no servidor. Tente novamente.');
    } else if (msg && status !== 401) {
      toast.error(msg);
    }
    return Promise.reject(error);
  }
);

export default api;
