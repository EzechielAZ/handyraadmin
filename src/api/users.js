import api from './axios';

export const getUsers = (params) => api.get('/users', { params });
export const getUserById = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const suspendUser = (id, reason) => api.post(`/users/${id}/suspend`, { reason });
export const banUser = (id, reason) => api.post(`/users/${id}/ban`, { reason });
export const getUserStats = () => api.get('/users/stats');
