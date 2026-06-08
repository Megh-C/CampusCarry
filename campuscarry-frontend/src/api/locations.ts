import apiClient from './client'
import type { Location } from '@/types'

export const locationsApi = {
  getActive: () =>
    apiClient.get<never, Location[]>('/locations'),
}
