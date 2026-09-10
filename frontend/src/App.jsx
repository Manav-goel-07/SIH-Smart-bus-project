import { useMemo, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import RoadIssues from './pages/RoadIssues'
import Traffic from './pages/Traffic'
import LiveMap from './pages/LiveMap'
import { useFleetData } from './hooks/useFleetData'

export default function App() {
  const fleet = useFleetData()
  const [notifications, setNotifications] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem('sbi-theme') || 'dark')
  const dismissNotification = (id) => setNotifications((items) => items.filter((item) => item.id !== id))
  const toggleTheme = () => setTheme((current) => {
    const next = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem('sbi-theme', next)
    return next
  })
  const context = useMemo(() => ({ ...fleet, notifications, dismissNotification, theme }), [fleet, notifications, theme])

  return <AppShell {...context} onToggleTheme={toggleTheme}>
    <Routes>
      <Route path="/" element={<Dashboard {...context} />} />
      <Route path="/map" element={<LiveMap {...context} />} />
      <Route path="/incidents" element={<Incidents {...context} />} />
      <Route path="/road-issues" element={<RoadIssues {...context} />} />
      <Route path="/traffic" element={<Traffic {...context} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AppShell>
}
