import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BusFront, FileImage, Filter, MapPin, Search, ShieldAlert, UploadCloud, X } from 'lucide-react'
import { apiService } from '../services/api'
import { imageBucket, supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { FeedState, StatusPill } from '../components/ui'
import { confidence, coord, relativeTime, shortTime, titleCase } from '../utils/format'

const statuses = ['ALL', 'PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS']
const displayStatus = (value) => value === 'NEW' ? 'PENDING' : value === 'INVESTIGATING' ? 'IN_PROGRESS' : value || 'PENDING'

export default function Incidents({ incidents, loading, error, refresh }) {
  const [status, setStatus] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => incidents.filter((item) => (status === 'ALL' || displayStatus(item.status) === status) && (!query || `${item.incident_type} ${item.bus_id} ${item.vehicle_number || ''}`.toLowerCase().includes(query.toLowerCase()))), [incidents, status, query])
  return <div className="page"><div className="page-top"><div><div className="eyebrow">Safety command queue</div><h1>Incident monitoring</h1><p>Review, assign and resolve live safety signals from the bus network.</p></div><div className="page-top-badge"><ShieldAlert size={16} /> {incidents.length} total signals</div></div><section className="panel"><div className="toolbar"><div className="status-tabs">{statuses.map((item) => <button className={status === item ? 'selected' : ''} onClick={() => setStatus(item)} key={item}>{item === 'ALL' ? 'All' : titleCase(item)}</button>)}</div><div className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bus, type or plate" /></div><button className="icon-btn" title="Filter incidents"><Filter size={17} /></button></div><FeedState loading={loading} error={error && !incidents.length ? error : ''} empty={!filtered.length} onRetry={refresh}><div className="incident-table"><div className="table-head"><span>Signal</span><span>Location</span><span>Confidence</span><span>Priority</span><span>State</span><span>Detected</span><span /></div>{filtered.map((item) => <button className={`incident-card ${String(item.severity).toLowerCase() === 'high' ? 'high' : ''}`} key={item.id} onClick={() => setSelected(item)}><span className={`incident-marker marker-${String(item.severity || '').toLowerCase()}`}><ShieldAlert size={16} /></span><span className="incident-name"><strong>{titleCase(item.incident_type)}</strong><small><BusFront size={13} /> {item.bus_id}{item.vehicle_number ? ` · ${item.vehicle_number}` : ''}</small></span><span className="location-cell"><MapPin size={13} />{coord(item.location)}</span><span className="confidence-cell"><b>{confidence(item.confidence)}</b><i><em style={{ width: `${Number(item.confidence || 0) * 100}%` }} /></i></span><span className="priority-cell"><b>{item.priority_score || '—'}</b><small>/ 100</small></span><StatusPill value={displayStatus(item.status)} /><span className="detected-cell">{relativeTime(item.timestamp)}<small>{shortTime(item.timestamp)}</small></span><ArrowUpRight size={17} className="row-arrow" /></button>)}</div></FeedState></section>{selected && <IncidentDrawer incident={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); refresh() }} />}</div>
}

function IncidentDrawer({ incident, onClose, onUpdated }) {
  const { profile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(displayStatus(incident.status))
  const [evidence, setEvidence] = useState(null)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true); setError('')
    try {
      let evidencePath = incident.evidence_url
      if (evidence) {
        const path = `${profile.id}/${Date.now()}-${evidence.name.replace(/[^a-z0-9._-]/gi, '-')}`
        const result = await supabase.storage.from(imageBucket).upload(path, evidence, { upsert: false, contentType: evidence.type, cacheControl: '3600' })
        if (result.error) throw result.error
        evidencePath = `${imageBucket}/${path}`
      }
      await apiService.updateIncident(incident.id, selectedStatus, evidencePath)
      onUpdated()
    } catch (saveError) { setError(saveError.message) } finally { setBusy(false) }
  }
  return <div className="drawer-scrim" onClick={onClose}><aside className="incident-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">Incident investigation</div><h2>{titleCase(incident.incident_type)}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><div className="drawer-severity"><span className={`incident-marker marker-${String(incident.severity || '').toLowerCase()}`}><ShieldAlert size={18} /></span><div><strong>{titleCase(incident.severity)} severity signal</strong><span>{relativeTime(incident.timestamp)} · {titleCase(displayStatus(incident.status))}</span></div></div><PriorityPanel item={incident} /><div className="detail-grid"><Detail label="Incident ID" value={incident.id} /><Detail label="Bus ID" value={incident.bus_id} /><Detail label="Detection time" value={shortTime(incident.timestamp)} /><Detail label="Location" value={coord(incident.location)} /><Detail label="AI confidence" value={confidence(incident.confidence)} /><Detail label="Vehicle number" value={incident.vehicle_number || 'Not identified'} /></div><EvidencePreview evidencePath={incident.evidence_url} /><label className="evidence-upload"><FileImage size={15} /><span>{evidence ? evidence.name : 'Add photo evidence'}</span><input type="file" accept="image/*" onChange={(event) => setEvidence(event.target.files?.[0] || null)} /></label><StatusEditor selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} busy={busy} save={save} error={error} /></aside></div>
}

function PriorityPanel({ item }) { return <div className="priority-panel"><div><span>Priority score</span><strong>{item.priority_score || '—'}<small>/100</small></strong></div><p>{item.priority_reasons?.join(' · ') || 'Priority evidence is not available yet.'}</p>{item.priority_evidence?.nearby_traffic && <small>Traffic evidence: {item.priority_evidence.nearby_traffic.avg_vehicle_count == null ? 'No nearby observation' : `${Math.round(item.priority_evidence.nearby_traffic.avg_vehicle_count)} average vehicles · ${titleCase(item.priority_evidence.nearby_traffic.congestion_level)} congestion`}</small>}</div> }
function StatusEditor({ selectedStatus, setSelectedStatus, busy, save, error }) { return <div className="drawer-actions"><span>Update status</span><div className="status-choice-row">{['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].map((value) => <button key={value} className={selectedStatus === value ? 'selected' : ''} disabled={busy} onClick={() => setSelectedStatus(value)}>{titleCase(value)}</button>)}</div><button className="drawer-save" disabled={busy} onClick={save}>{busy ? 'Saving…' : <><UploadCloud size={15} /> Save update</>}</button>{error && <small className="drawer-error">{error}</small>}</div> }
function EvidencePreview({ evidencePath }) { const [url, setUrl] = useState(''); useEffect(() => { let active = true; if (!evidencePath || !supabase) return undefined; const split = evidencePath.indexOf('/'); const bucket = split > 0 ? evidencePath.slice(0, split) : imageBucket; const path = split > 0 ? evidencePath.slice(split + 1) : evidencePath; supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => { if (active) setUrl(data?.signedUrl || '') }); return () => { active = false } }, [evidencePath]); if (!evidencePath || !url) return null; return <div className="evidence-preview"><span>Photo evidence</span><a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Incident evidence" /></a></div> }
function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div> }
