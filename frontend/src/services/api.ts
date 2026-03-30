import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

export const usersApi = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
}

export const tripsApi = {
  list: () => api.get('/trips'),
  get: (id: number) => api.get(`/trips/${id}`),
  create: (data: any) => api.post('/trips', data),
  update: (id: number, data: any) => api.put(`/trips/${id}`, data),
  delete: (id: number) => api.delete(`/trips/${id}`),
  getDays: (id: number) => api.get(`/trips/${id}/days`),
  updateDay: (tripId: number, dayId: number, data: any) => api.put(`/trips/${tripId}/days/${dayId}`, data),
  getMembers: (id: number) => api.get(`/trips/${id}/members`),
  addMember: (id: number, data: any) => api.post(`/trips/${id}/members`, data),
  removeMember: (id: number, userId: number) => api.delete(`/trips/${id}/members/${userId}`),
}

export const placesApi = {
  list: (tripId: number) => api.get(`/trips/${tripId}/places`),
  create: (tripId: number, data: any) => api.post(`/trips/${tripId}/places`, data),
  update: (tripId: number, placeId: number, data: any) => api.put(`/trips/${tripId}/places/${placeId}`, data),
  delete: (tripId: number, placeId: number) => api.delete(`/trips/${tripId}/places/${placeId}`),
  reorder: (tripId: number, placeIds: number[]) => api.post(`/trips/${tripId}/places/reorder`, { place_ids: placeIds }),
  getRoute: (tripId: number, dayId: number) => api.get(`/trips/${tripId}/route`, { params: { day_id: dayId } }),
  geocode: (q: string) => api.get('/geocode/search', { params: { q } }),
}

export const expensesApi = {
  list: (tripId: number) => api.get(`/trips/${tripId}/expenses`),
  create: (tripId: number, data: any) => api.post(`/trips/${tripId}/expenses`, data),
  update: (tripId: number, id: number, data: any) => api.put(`/trips/${tripId}/expenses/${id}`, data),
  delete: (tripId: number, id: number) => api.delete(`/trips/${tripId}/expenses/${id}`),
  summary: (tripId: number) => api.get(`/trips/${tripId}/expenses/summary`),
}

export const bookingsApi = {
  list: (tripId: number) => api.get(`/trips/${tripId}/bookings`),
  create: (tripId: number, data: any) => api.post(`/trips/${tripId}/bookings`, data),
  update: (tripId: number, id: number, data: any) => api.put(`/trips/${tripId}/bookings/${id}`, data),
  delete: (tripId: number, id: number) => api.delete(`/trips/${tripId}/bookings/${id}`),
}

export const filesApi = {
  list: (tripId: number) => api.get(`/trips/${tripId}/files`),
  upload: (tripId: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/trips/${tripId}/files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  delete: (tripId: number, id: number) => api.delete(`/trips/${tripId}/files/${id}`),
}

export const activityApi = {
  list: (tripId: number) => api.get(`/trips/${tripId}/activity`),
}

export default api
