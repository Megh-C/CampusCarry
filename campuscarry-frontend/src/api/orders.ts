import apiClient from './client'
import type { Order, OrderFeedItem, CreateOrderRequest, PageResponse } from '@/types'

export const ordersApi = {
  getFeed: (params?: { pickupLocationId?: string; page?: number; size?: number }) =>
    apiClient.get<never, PageResponse<OrderFeedItem>>('/orders/feed', { params }),

  getMyOrders: (params: { role: 'requester' | 'deliverer'; page?: number; size?: number }) =>
    apiClient.get<never, PageResponse<Order>>('/orders/me', { params }),

  getById: (id: string) =>
    apiClient.get<never, Order>(`/orders/${id}`),

  create: (data: CreateOrderRequest) =>
    apiClient.post<never, Order>('/orders', data),

  accept: (id: string) =>
    apiClient.post<never, Order>(`/orders/${id}/accept`),

  notifyArrival: (id: string) =>
    apiClient.post<never, Order>(`/orders/${id}/notify`),

  confirmDelivery: (id: string, otp: string) =>
    apiClient.post<never, Order>(`/orders/${id}/deliver`, { otp }),

  retry: (id: string) =>
    apiClient.post<never, Order>(`/orders/${id}/retry`),

  submitRating: (id: string, stars: number, description?: string) =>
    apiClient.post(`/orders/${id}/rate`, { stars, description }),

  skipRating: (id: string) =>
    apiClient.post(`/orders/${id}/skip-rate`),

  getRating: (id: string) =>
    apiClient.get(`/orders/${id}/rating`),

  getEstimate: (params: { pickupLocationId: string; dropHostelBlock: string; size: string }) =>
    apiClient.get('/orders/estimate', { params }),
}
