import api from './axios';

export const getHPOContracts = (params) => api.get('/hpo/contracts', { params });
export const getHPOContractById = (id) => api.get(`/hpo/contracts/${id}`);
export const getSupervisors = (params) => api.get('/hpo/supervisors', { params });
export const getSupervisorById = (id) => api.get(`/hpo/supervisors/${id}`);
export const getAgents = (params) => api.get('/agents', { params });
export const getAgentById = (id) => api.get(`/agents/${id}`);
export const getHPOStats = () => api.get('/hpo/stats');
