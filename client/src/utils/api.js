import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Goals
export const goalsAPI = {
  getMy: (cycle) => api.get('/goals/my', { params: { cycle } }),
  getTeam: (params) => api.get('/goals/team', { params }),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  submit: (cycle) => api.post('/goals/submit', { cycle }),
  approve: (id, data) => api.put(`/goals/${id}/approve`, data),
  unlock: (id, reason) => api.put(`/goals/${id}/unlock`, { reason }),
  logAchievement: (id, data) => api.post(`/goals/${id}/achievement`, data),
  pushShared: (data) => api.post('/goals/shared', data),
  getOne: (id) => api.get(`/goals/${id}`),
};

// Check-ins
export const checkinsAPI = {
  create: (data) => api.post('/checkins', data),
  get: (params) => api.get('/checkins', { params }),
  dashboard: (params) => api.get('/checkins/dashboard', { params }),
};

// Reports
export const reportsAPI = {
  achievement: (params) => api.get('/reports/achievement', { params }),
  exportCsv: (params) => api.get('/reports/achievement/export', { params, responseType: 'blob' }),
  audit: (params) => api.get('/reports/audit', { params }),
};

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  getManagers: () => api.get('/users/list/managers'),
};

// Admin
export const adminAPI = {
  getCycles: () => api.get('/admin/cycles'),
  getActiveCycle: () => api.get('/admin/cycles/active'),
  saveCycle: (data) => api.post('/admin/cycles', data),
  getStats: () => api.get('/admin/stats'),
};

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};
