import api from './axios';

export const getStores = (params) => api.get('/hardware-stores', { params });
export const getStoreById = (id) => api.get(`/hardware-stores/${id}`);
export const verifyStore = (id) => api.post(`/hardware-stores/${id}/verify`);
export const updateStore = (id, data) => api.put(`/hardware-stores/${id}`, data);
