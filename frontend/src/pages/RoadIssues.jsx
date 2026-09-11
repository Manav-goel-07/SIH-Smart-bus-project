import { useEffect, useState } from 'react'
import { FileImage, Route, TrafficCone, UploadCloud, X } from 'lucide-react'
import { apiService } from '../services/api'
import { imageBucket, supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { FeedState, SectionHeading, StatusPill } from '../components/ui'
import { confidence, coord, relativeTime, titleCase } from '../utils/format'

const displayStatus = (value) => value === 'NEW' ? 'PENDING' : value === 'INVESTIGATING' ? 'IN_PROGRESS' : value || 'PENDING'

export default function RoadIssues({ roadIssues, loading, error, refresh }) {
  const [selected, setSelected] = useState(null)
  return <div className="page"><div className="page-top"><div><div className="eyebrow">Infrastructure intelligence</div><h1>Road issue registry</h1><p>Corroborated infrastructure signals, grouped by location.</p></div><div className="page-top-badge"><TrafficCone size={16} /> {roadIssues.length} monitored issues</div></div><section className="panel"><SectionHeading eyebrow="Road network" title="Active infrastructure signals" description="Multiple buses corroborate the same issue to increase confidence." /><FeedState loading={loading} error={error && !roadIssues.length ? error : ''} empty={!roadIssues.length} onRetry={refresh}><div className="issue-grid">{roadIssues.map((issue) => <article className="issue-card" key={issue.id} onClick={() => setSelected(issue)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelected(issue)}><div className="issue-card-head"><span className="issue-icon"><TrafficCone size={18} /></span><StatusPill value={displayStatus(issue.status)} /><button className="icon-btn" title="View on map" onClick={(event) => event.stopPropagation()}><Route size={16} /></button></div><h3>{titleCase(issue.issue_type)}</h3><div className="issue-location">{coord(issue.location)}</div><div className="issue-metrics"><Metric label="Detections" value={issue.detection_count} /><Metric label="AI confidence" value={confidence(issue.max_confidence)} /><Metric label="Last seen" value={relativeTime(issue.last_detected_at)} /></div><div className="corroboration"><div className="bus-stack"><i>SB</i><i>SB</i><i>SB</i></div><strong>Detected by {issue.unique_bus_count || issue.detection_count || 0} buses</strong><span>Click to update status or add evidence</span></div></article>)}</div></FeedState></section>{selected && <RoadIssueDrawer issue={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); refresh() }} />}</div>
}

function RoadIssueDrawer({ issue, onClose, onUpdated }) {
  const { profile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(displayStatus(issue.status))
  const [evidence, setEvidence] = useState(null)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true); setError('')
    try {
      let evidencePath = issue.evidence_url
      if (evidence) {
        const path = `${profile.id}/${Date.now()}-${evidence.name.replace(/[^a-z0-9._-]/gi, '-')}`
        const result = await supabase.storage.from(imageBucket).upload(path, evidence, { upsert: false, contentType: evidence.type, cacheControl: '3600' })
        if (result.error) throw result.error
        evidencePath = `${imageBucket}/${path}`
      }
      await apiService.updateRoadIssue(issue.id, selectedStatus, evidencePath)
      onUpdated()
    } catch (saveError) { setError(saveError.message) } finally { setBusy(false) }
  }
  return <div className="drawer-scrim" onClick={onClose}><aside className="incident-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">Road issue review</div><h2>{titleCase(issue.issue_type)}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><div className="drawer-severity"><span className="incident-marker marker-high"><TrafficCone size={18} /></span><div><strong>{titleCase(issue.severity)} infrastructure signal</strong><span>{titleCase(displayStatus(issue.status))} · {relativeTime(issue.last_detected_at)}</span></div></div><div className="detail-grid"><Detail label="Issue ID" value={issue.id} /><Detail label="Location" value={coord(issue.location)} /><Detail label="Detections" value={issue.detection_count} /><Detail label="AI confidence" value={confidence(issue.max_confidence)} /></div><EvidencePreview evidencePath={issue.evidence_url} /><label className="evidence-upload"><FileImage size={15} /><span>{evidence ? evidence.name : 'Add photo evidence'}</span><input type="file" accept="image/*" onChange={(event) => setEvidence(event.target.files?.[0] || null)} /></label><div className="drawer-actions"><span>Update status</span><div className="status-choice-row">{['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].map((value) => <button key={value} className={selectedStatus === value ? 'selected' : ''} disabled={busy} onClick={() => setSelectedStatus(value)}>{titleCase(value)}</button>)}</div><button className="drawer-save" disabled={busy} onClick={save}>{busy ? 'Saving…' : <><UploadCloud size={15} /> Save update</>}</button>{error && <small className="drawer-error">{error}</small>}</div></aside></div>
}

function EvidencePreview({ evidencePath }) {
  const [url, setUrl] = useState('')
  useEffect(() => { let active = true; if (!evidencePath || !supabase) return undefined; const split = evidencePath.indexOf('/'); const bucket = split > 0 ? evidencePath.slice(0, split) : imageBucket; const path = split > 0 ? evidencePath.slice(split + 1) : evidencePath; supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => { if (active) setUrl(data?.signedUrl || '') }); return () => { active = false } }, [evidencePath])
  if (!evidencePath || !url) return null
  return <div className="evidence-preview"><span>Photo evidence</span><a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Road issue evidence" /></a></div>
}

function Metric({ label, value }) { return <div><span>{label}</span><strong>{value || '—'}</strong></div> }
function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div> }
