import api from './axios';

export const getReports = (params) => api.get('/reports', { params });
export const getReportById = (id) => api.get(`/reports/${id}`);
export const updateReport = (id, data) => api.put(`/reports/${id}`, data);
export const resolveReport = (id, note) => api.post(`/reports/${id}/resolve`, { note });
export const dismissReport = (id, note) => api.post(`/reports/${id}/dismiss`, { note });
export const getReportStats = () => api.get('/reports/stats');
