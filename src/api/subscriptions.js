import api from './axios';

export const getSubscriptions = (params) => api.get('/subscriptions', { params });
export const getPlans = () => api.get('/subscriptions/plans');
export const getSubscriptionStats = () => api.get('/subscriptions/stats');
