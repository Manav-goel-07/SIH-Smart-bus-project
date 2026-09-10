import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle, RefreshCw } from 'lucide-react'
import { titleCase } from '../utils/format'

export function StatusPill({ value, dot = true }) {
  const tone = String(value || '').toLowerCase().replace(/\s/g, '-')
  return <span className={`status-pill status-${tone}`}>{dot && <i />}{titleCase(value || 'Unknown')}</span>
}

export function Skeleton({ className = '' }) { return <div className={`skeleton ${className}`} /> }
export function FeedState({ loading, error, empty, onRetry, children }) {
  if (loading) return <div className="feed-state"> <LoaderCircle className="spin" size={22} /><span>Syncing intelligence feed</span></div>
  if (error) return <div className="feed-state feed-error"><AlertTriangle size={22} /><div><strong>Feed unavailable</strong><span>{error}</span></div>{onRetry && <button className="icon-btn" onClick={onRetry} title="Retry feed"><RefreshCw size={16} /></button>}</div>
  if (empty) return <div className="feed-state"><Inbox size={24} /><div><strong>No active signals</strong><span>All monitored routes are currently clear.</span></div></div>
  return children
}
export function StatCard({ label, value, meta, icon: Icon, tone = 'cyan', compact = false }) { return <article className={`stat-card ${compact ? 'compact' : ''} tone-${tone}`}><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon"><Icon size={18} /></span></div><div className="stat-value">{value ?? '—'}</div><div className="stat-meta"><span className="signal-dot" />{meta}</div></article> }
export function SectionHeading({ eyebrow, title, description, action }) { return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div> }
export function EmptyState({ title = 'No data available', detail = 'Signals will appear here when the network reports activity.', icon: Icon = CheckCircle2 }) { return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><strong>{title}</strong><span>{detail}</span></div> }
