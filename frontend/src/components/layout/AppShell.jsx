import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Activity, Bell, ChevronRight, CircleHelp, LayoutDashboard, LogOut, Map, Menu, Moon, Radio, Settings, ShieldAlert, Sun, TrafficCone, X } from 'lucide-react'
import { StatusPill } from '../ui'
import { useAuth } from '../../auth/AuthProvider'

const nav = [{ label: 'Overview', path: '/', icon: LayoutDashboard }, { label: 'Live map', path: '/map', icon: Map }, { label: 'Incidents', path: '/incidents', icon: ShieldAlert }, { label: 'Road issues', path: '/road-issues', icon: TrafficCone }, { label: 'Traffic analytics', path: '/traffic', icon: Activity }]

export default function AppShell({ children, apiStatus, realtimeStatus, notifications = [], dismissNotification, theme = 'dark', onToggleTheme, profile }) {
  const [open, setOpen] = useState(false)
  const { signOut } = useAuth()
  const location = useLocation()
  const pageLabel = nav.find((item) => item.path === location.pathname)?.label || 'Overview'
  return <div className={`app-shell theme-${theme}`}>
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><img className="brand-logo" src="/sih-logo.png" alt="SIH logo" /></span><div><strong>UrbanEye</strong><span>City intelligence</span></div><button className="icon-btn mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <div className="nav-caption">Command center</div>
      <nav>{nav.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><Icon size={18} /><span>{label}</span>{label === 'Incidents' && <span className="nav-count">live</span>}<ChevronRight size={15} className="nav-arrow" /></NavLink>)}</nav>
      <div className="sidebar-spacer" />
      <div className="system-card"><div className="system-title"><Radio size={16} /><span>System status</span></div><div className="system-row"><i className={apiStatus === 'connected' ? 'online' : ''} /><span>Backend {apiStatus === 'connected' ? 'connected' : 'offline'}</span></div><div className="system-row"><i className={realtimeStatus === 'connected' ? 'online' : ''} /><span>Realtime {realtimeStatus === 'connected' ? 'connected' : 'standby'}</span></div></div>
      <div className="sidebar-footer"><button className="nav-item muted"><Settings size={17} /><span>Settings</span></button><button className="nav-item muted"><CircleHelp size={17} /><span>Help center</span></button></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <main className="main-shell">
      <header className="topbar"><button className="icon-btn menu-trigger" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>City operations</span><ChevronRight size={14} /><strong>{pageLabel}</strong></div><div className="topbar-actions"><div className="topbar-live"><i /> Network live</div><button className="icon-btn" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-btn" title="Notifications"><Bell size={18} />{notifications.length > 0 && <b>{notifications.length}</b>}</button><div className="authority-profile"><div className="avatar">{(profile?.full_name || 'AO').slice(0, 2).toUpperCase()}</div><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={16} /></button></div></div></header>
      <div className="content-wrap">{children}</div>
    </main>
    <div className="toast-stack">{notifications.map((notification) => <div className={`toast toast-${String(notification.severity || '').toLowerCase()}`} key={notification.id}><span className="toast-icon"><Bell size={15} /></span><div><strong>{notification.title}</strong><span>{notification.detail}</span></div><button onClick={() => dismissNotification?.(notification.id)}><X size={14} /></button></div>)}</div>
  </div>
}
