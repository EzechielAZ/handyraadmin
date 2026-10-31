import api from './axios';

export const getPayments = (params) => api.get('/payments', { params });
export const getPaymentById = (id) => api.get(`/payments/${id}`);
export const refundPayment = (id, reason) => api.post(`/payments/${id}/refund`, { reason });
export const getPaymentStats = () => api.get('/payments/stats');
