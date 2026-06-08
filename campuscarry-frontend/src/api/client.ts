import axios from 'axios'
import type { ApiResponse } from '@/types'

const BASE_URL = 'http://localhost:8080/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Unwrap ApiResponseDto { success, message, data } → return data directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
apiClient.interceptors.response.use(
  (response): any => {
    const body = response.data as ApiResponse<unknown>
    return body.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cc_access_token')
      localStorage.removeItem('cc_user')
      window.location.href = '/login'
    }
    // Surface the backend message if available
    const msg =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong'
    return Promise.reject(new Error(msg))
  }
)

export default apiClient
