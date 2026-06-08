import apiClient from './client'
import type {
  AdminUser,
  AdminStats,
  Order,
  Location,
  Pricing,
  PageResponse,
  UserStatus,
  OrderStatus,
  OrderSize,
  PaymentStatus,
} from '@/types'

export const adminApi = {
  // Users
  getUsers: (params?: {
    search?: string
    status?: UserStatus
    gender?: string
    year?: number
    page?: number
    size?: number
    sortBy?: string
    sortDir?: string
  }) => apiClient.get<never, PageResponse<AdminUser>>('/admin/users', { params }),

  updateUserStatus: (id: string, status: UserStatus) =>
    apiClient.patch<never, AdminUser>(`/admin/users/${id}/status`, { status }),

  // Orders
  getOrders: (params?: {
    search?: string
    status?: OrderStatus
    size?: OrderSize
    paymentStatus?: PaymentStatus
    from?: string
    to?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortDir?: string
  }) => apiClient.get<never, PageResponse<Order>>('/admin/orders', { params }),

  getOrderById: (id: string) =>
    apiClient.get<never, Order>(`/admin/orders/${id}`),

  getFailedPayments: (params?: { from?: string; to?: string; page?: number; size?: number }) =>
    apiClient.get<never, PageResponse<Order>>('/admin/payments/failed', { params }),

  // Locations
  addLocation: (data: { name: string; code: string }) =>
    apiClient.post<never, Location>('/admin/locations', data),

  toggleLocation: (id: string) =>
    apiClient.patch<never, Location>(`/admin/locations/${id}/toggle`),

  // Pricing
  getPricing: () =>
    apiClient.get<never, Pricing[]>('/admin/pricing'),

  updatePricing: (id: string, basePrice: number) =>
    apiClient.patch<never, Pricing>(`/admin/pricing/${id}`, { basePrice }),

  // Stats
  getStats: (params?: { from?: string; to?: string }) =>
    apiClient.get<never, AdminStats>('/admin/stats', { params }),
}
