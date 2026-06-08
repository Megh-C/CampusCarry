import apiClient from './client'
import type { AuthResponse } from '@/types'

export const authApi = {
  initiateSignup: (email: string) =>
    apiClient.post<never, { message: string }>('/auth/signup/initiate', { email }),

  verifyOtp: (email: string, otp: string) =>
    apiClient.post<never, { message: string }>('/auth/signup/verify-otp', { email, otp }),

  completeSignup: (data: {
    email: string
    password: string
    confirmPassword: string
    fullName: string
    phone: string
    gender: string
    year: number
    hostelBlock: string
  }) => apiClient.post<never, { message: string }>('/auth/signup/complete', data),

  login: (email: string, password: string) =>
    apiClient.post<never, AuthResponse>('/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    apiClient.post<never, { message: string }>('/auth/forgot-password', { email }),

  resetPassword: (data: {
    email: string
    otp: string
    newPassword: string
    confirmNewPassword: string
  }) => apiClient.post<never, { message: string }>('/auth/reset-password', data),
}
