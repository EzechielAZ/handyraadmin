import api from './axios';

export const getArtisans = (params) => api.get('/artisans', { params });
export const getArtisanById = (id) => api.get(`/artisans/${id}`);
export const updateArtisan = (id, data) => api.put(`/artisans/${id}`, data);
export const validateKYC = (id) => api.post(`/artisans/${id}/kyc/validate`);
export const rejectKYC = (id, reason) => api.post(`/artisans/${id}/kyc/reject`, { reason });
export const suspendArtisan = (id, data) => api.post(`/artisans/${id}/suspend`, data);
export const getArtisanStats = () => api.get('/artisans/stats');
