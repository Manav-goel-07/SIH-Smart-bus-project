import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 9000,
  headers: { 'Content-Type': 'application/json' }
})

export const apiService = {
  summary: () => api.get('/api/dashboard/summary').then((r) => r.data),
  incidents: (params = {}) => api.get('/api/incidents/', { params }).then((r) => r.data),
  roadIssues: (params = {}) => api.get('/api/road-issues/', { params }).then((r) => r.data),
  hotspots: (params = {}) => api.get('/api/traffic/hotspots', { params }).then((r) => r.data),
  observations: (params = {}) => api.get('/api/traffic/observations', { params }).then((r) => r.data),
  updateIncidentStatus: (id, status) => api.patch(`/api/incidents/${id}/status`, null, { params: { status } }).then((r) => r.data)
}
