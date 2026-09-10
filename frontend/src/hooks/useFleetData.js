import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, apiService } from '../services/api'
import { useWebSocket } from './useWebSocket'

const replaceById = (items, incoming) => [incoming, ...items.filter((item) => item.id !== incoming.id)]

export function useFleetData() {
  const [data, setData] = useState({ incidents: [], roadIssues: [], hotspots: [], observations: [], summary: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiStatus, setApiStatus] = useState('checking')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    const responses = await Promise.allSettled([
      apiService.summary(), apiService.incidents({ limit: 80 }), apiService.roadIssues(), apiService.hotspots({ limit: 80 }), apiService.observations({ limit: 100 })
    ])
    const [summary, incidents, roadIssues, hotspots, observations] = responses
    const values = {
      summary: summary.status === 'fulfilled' ? summary.value : null,
      incidents: incidents.status === 'fulfilled' ? incidents.value : [],
      roadIssues: roadIssues.status === 'fulfilled' ? roadIssues.value : [],
      hotspots: hotspots.status === 'fulfilled' ? hotspots.value : [],
      observations: observations.status === 'fulfilled' ? observations.value : []
    }
    const failed = responses.filter((item) => item.status === 'rejected').length
    if (failed === responses.length) setError('The intelligence API is unavailable. Start the FastAPI service to bring the live feeds online.')
    else if (failed) setError('Some feeds are unavailable. Showing the data that is currently reachable.')
    setApiStatus(failed === responses.length ? 'disconnected' : 'connected')
    setData(values); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  const handleMessage = useCallback((message) => {
    if (message.type === 'NEW_INCIDENT' && message.incident) setData((prev) => ({ ...prev, incidents: replaceById(prev.incidents, message.incident) }))
    if (message.type === 'ROAD_ISSUE_UPDATE' && message.road_issue) setData((prev) => ({ ...prev, roadIssues: replaceById(prev.roadIssues, message.road_issue) }))
    if (message.type === 'TRAFFIC_HOTSPOT_UPDATE' && message.hotspot) setData((prev) => ({ ...prev, hotspots: replaceById(prev.hotspots, message.hotspot) }))
  }, [])
  const realtimeStatus = useWebSocket(handleMessage)
  const derived = useMemo(() => {
    const highIncidents = data.incidents.filter((i) => String(i.severity).toUpperCase() === 'HIGH').length
    const highCongestion = data.hotspots.filter((h) => String(h.congestion_level).toUpperCase() === 'HIGH').length
    return { totalEvents: data.summary?.total_events ?? data.incidents.length + data.roadIssues.length + data.observations.length, activeRoadIssues: data.summary?.active_road_issues ?? data.roadIssues.length, trafficHotspots: data.summary?.traffic_hotspots ?? data.hotspots.length, activeIncidents: data.summary?.active_incidents ?? data.incidents.filter((i) => i.status !== 'RESOLVED').length, highSeverity: data.summary?.high_severity_issues ?? highIncidents, highCongestion: data.summary?.high_congestion_hotspots ?? highCongestion }
  }, [data])
  return { ...data, ...derived, loading, error, apiStatus, realtimeStatus, refresh: load }
}

export { api }
