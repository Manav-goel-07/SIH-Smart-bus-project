import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 9000,
  headers: { 'Content-Type': 'application/json' }
})

const mlApiUrl = import.meta.env.VITE_ML_API_URL || 'http://127.0.0.1:8001'

const requestMl = async (endpoint, file) => {
  const form = new FormData()
  form.append('file', file)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 180000)
  try {
    const response = await fetch(`${mlApiUrl}${endpoint}`, { method: 'POST', body: form, signal: controller.signal })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.detail || `ML service returned HTTP ${response.status}.`)
    return data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('ML service timed out after 3 minutes. Check Render logs and service health.')
    if (error instanceof TypeError) throw new Error('ML service is unreachable or Render returned a CORS/network error. Check the ML service /health endpoint and redeploy it if needed.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export const apiService = {
  summary: () => api.get('/api/dashboard/summary').then((r) => r.data),
  incidents: (params = {}) => api.get('/api/incidents/', { params }).then((r) => r.data),
  roadIssues: (params = {}) => api.get('/api/road-issues/', { params }).then((r) => r.data),
  createEvent: (payload) => api.post('/api/events/', payload).then((r) => r.data),
  hotspots: (params = {}) => api.get('/api/traffic/hotspots', { params }).then((r) => r.data),
  observations: (params = {}) => api.get('/api/traffic/observations', { params }).then((r) => r.data),
  updateIncidentStatus: (id, status) => api.patch(`/api/incidents/${id}/status`, null, { params: { status } }).then((r) => r.data),
  updateIncident: (id, status, evidenceUrl) => api.patch(`/api/incidents/${id}/status`, null, { params: { status, ...(evidenceUrl ? { evidence_url: evidenceUrl } : {}) } }).then((r) => r.data),
  updateRoadIssue: (id, status, evidenceUrl) => api.patch(`/api/road-issues/${id}`, null, { params: { status, ...(evidenceUrl ? { evidence_url: evidenceUrl } : {}) } }).then((r) => r.data),
  analyzeVideo: (file) => requestMl('/predict/video', file),
  analyzeImage: (file) => requestMl('/predict/image', file)
}
