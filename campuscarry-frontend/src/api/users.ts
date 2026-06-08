import apiClient from './client'
import type { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from '@/types'

export const usersApi = {
  getProfile: () =>
    apiClient.get<never, UserProfile>('/me'),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<never, UserProfile>('/me', data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.patch<never, { message: string }>('/me/password', data),
}
