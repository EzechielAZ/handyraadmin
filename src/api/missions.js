import api from './axios';

export const getMissions = (params) => api.get('/missions', { params });
export const getMissionById = (id) => api.get(`/missions/${id}`);
export const updateMission = (id, data) => api.put(`/missions/${id}`, data);
export const cancelMission = (id, reason) => api.post(`/missions/${id}/cancel`, { reason });
export const getMissionStats = () => api.get('/missions/stats');
