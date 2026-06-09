// ── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'STUDENT' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED'
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'DELIVERED' | 'EXPIRED' | 'UNPAID'
export type OrderSize = 'SMALL' | 'MEDIUM' | 'LARGE'
export type PaymentStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'FAILED'

// ── API wrapper ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty: boolean
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string
  fullName: string
  email: string
  role: Role
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  userId: string
  fullName: string
  email: string
  role: Role
}

// ── User / Profile ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  fullName: string
  email: string
  phone: string
  gender: string
  year: number
  hostelBlock: string
  upiId?: string
  role: Role
  status: UserStatus
  rating?: number
  totalDeliveries: number
  isOnDelivery: boolean
  activeSmall: number
  activeMedium: number
  activeLarge: number
  createdAt: string
  updatedAt: string
}

// ── Order ─────────────────────────────────────────────────────────────────────

export interface Order {
  id: string
  orderNumber: number
  size: OrderSize
  status: OrderStatus
  description?: string
  dropHostelBlock: string
  deliveryFee: number
  pickupLocationId: string
  pickupLocationName?: string
  requesterId: string
  requesterName: string
  requesterPhone?: string
  delivererId?: string
  delivererName?: string
  delivererPhone?: string
  paymentStatus: PaymentStatus
  createdAt: string
  expiresAt: string
  acceptedAt?: string
  deliveredAt?: string
  isRated: boolean
  isRatingSkipped: boolean
  ratingStars?: number
}

export interface OrderFeedItem {
  id: string
  orderNumber: number
  size: OrderSize
  description?: string
  pickupLocationName?: string
  dropHostelBlock: string
  deliveryFee: number
  requesterName: string
  expiresAt: string
  createdAt: string
}

// ── Location ──────────────────────────────────────────────────────────────────

export interface Location {
  id: string
  name: string
  code: string
  active?: boolean
}

export interface FeeEstimate {
  pickupLocationId: string
  pickupLocationName: string
  dropHostelBlock: string
  size: OrderSize
  estimatedFee: number
}

// ── Rating ────────────────────────────────────────────────────────────────────

export interface Rating {
  id: string
  orderId: string
  orderNumber: number
  raterId: string
  raterName: string
  rateeId: string
  rateeName: string
  stars: number
  description?: string
  delivererNewAverageRating?: number
  createdAt: string
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  fullName: string
  email: string
  phone: string
  gender: string
  year: number
  hostelBlock: string
  upiId?: string
  role: Role
  status: UserStatus
  rating?: number
  totalDeliveries: number
  isOnDelivery: boolean
  activeSmall: number
  activeMedium: number
  activeLarge: number
  createdAt: string
  updatedAt: string
}

export interface AdminStats {
  from: string
  to: string
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  bannedUsers: number
  totalOrders: number
  pendingOrders: number
  acceptedOrders: number
  deliveredOrders: number
  expiredOrders: number
  totalRevenue: number
  failedPayments: number
}

export interface Pricing {
  id: string
  locationId: string
  locationName: string
  cluster: string
  basePrice: number
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  pickupLocationId: string
  description?: string
  size: OrderSize
  dropHostelBlock: string
}

export interface UpdateProfileRequest {
  fullName?: string
  phone?: string
  hostelBlock?: string
  upiId?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export interface SubmitRatingRequest {
  stars: number
  description?: string
}
