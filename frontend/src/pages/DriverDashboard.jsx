import { useRef, useState } from 'react'
import { Activity, CheckCircle2, Clock3, CloudUpload, FileImage, FileVideo, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { imageBucket, supabase, videoBucket } from '../lib/supabase'
import ProfileMenu from '../components/layout/ProfileMenu'
import { apiService } from '../services/api'

const roadDamageType = (value) => {
  const label = String(value || '').toLowerCase()
  if (label === 'd40' || label.includes('pothole')) return 'pothole'
  if (['d00', 'd10', 'd20'].includes(label) || label.includes('crack')) return 'crack'
  return null
}

const getDeviceLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('This browser does not provide device location.'))
  navigator.geolocation.getCurrentPosition(
    (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    () => reject(new Error('Location permission is required to file a geolocated road complaint.')),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
  )
})

const complaintSeverity = (confidence) => confidence >= .75 ? 'HIGH' : confidence >= .45 ? 'MEDIUM' : 'LOW'

export default function DriverDashboard() {
  const { profile } = useAuth()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [locationStatus, setLocationStatus] = useState('')

  const onFile = (nextFile) => {
    setError('')
    setMessage('')
    setAnalysis(null)
    if (!nextFile) return
    if (!nextFile.type.startsWith('video/') && !nextFile.type.startsWith('image/')) return setError('Choose an image or video file.')
    if (nextFile.size > 500 * 1024 * 1024) return setError('Files must be smaller than 500 MB.')
    setFile(nextFile)
  }

  const isImage = file?.type.startsWith('image/')
  const upload = async () => {
    if (!file || !supabase || !profile) return
    setBusy(true)
    setError('')
    setMessage('')
    setAnalysis(null)
    setLocationStatus('Requesting device location...')
    let deviceLocation
    try {
      deviceLocation = await getDeviceLocation()
      setLocationStatus('Location captured for this upload.')
    } catch (locationError) {
      setLocationStatus('')
      setError(`${locationError.message} Enable location access in your browser and try again.`)
      setBusy(false)
      return
    }
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-')
    const bucket = isImage ? imageBucket : videoBucket
    const path = `${profile.id}/${Date.now()}-${safeName}`
    const stored = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (stored.error) {
      setError(stored.error.message)
      setBusy(false)
      return
    }
    setMessage(`Uploaded securely. Running ${isImage ? 'image' : 'video'} road-damage detection...`)
    try {
      const detection = isImage ? await apiService.analyzeImage(file) : await apiService.analyzeVideo(file)
      setAnalysis(detection)
      const rawDetections = Array.isArray(detection.detections) ? detection.detections : []
      const roadDetections = rawDetections.filter((item) => roadDamageType(item.class_name))
      let complaintCount = 0
      if (roadDetections.length) {
        const evidencePath = `${bucket}/${path}`
        const grouped = Object.entries(roadDetections.reduce((groups, item) => {
          const type = roadDamageType(item.class_name)
          groups[type] ||= []
          groups[type].push(item)
          return groups
        }, {}))
        await Promise.all(grouped.map(([eventType, detections]) => {
          const confidence = Math.max(...detections.map((item) => Number(item.confidence) || 0))
          return apiService.createEvent({
            bus_id: profile.bus_id || 'UNKNOWN-BUS',
            event_type: eventType,
            timestamp: new Date().toISOString(),
            location: deviceLocation,
            confidence,
            severity: complaintSeverity(confidence),
            evidence_url: evidencePath,
            metadata: {
              source: 'driver_upload',
              file_name: file.name,
              evidence_type: isImage ? 'image' : 'video',
              model_detections: detections.length,
              detector_classes: detections.map((item) => item.class_name),
            },
          })
        }))
        complaintCount = grouped.length
      }
      const totalDetections = Number(detection.summary?.total_detections ?? rawDetections.length)
      const counts = Object.entries(detection.summary?.counts || {}).map(([label, count]) => `${label}: ${count}`).join(', ')
      setMessage(totalDetections > 0
        ? `Analysis complete: ${totalDetections} detection${totalDetections === 1 ? '' : 's'}${counts ? ` (${counts})` : ''}${complaintCount ? ` · ${complaintCount} complaint${complaintCount === 1 ? '' : 's'} filed at device location` : ''}`
        : 'Analysis complete: no detections returned by the model.')
    } catch (analysisError) {
      setError(analysisError.message.includes('Location') ? analysisError.message : `Upload succeeded, but ML analysis or complaint filing is unavailable: ${analysisError.message}`)
    }
    setFile(null)
    setBusy(false)
  }

  return <div className="driver-shell"><header className="driver-topbar"><div className="driver-brand"><span className="driver-logo"><img src="/sih-logo.png" alt="SIH logo" /></span><div><strong>UrbanEye</strong><span>Driver workspace</span></div></div><div className="driver-user"><div><strong>{profile?.full_name}</strong><span>{profile?.bus_id || 'Field operator'}</span></div><ProfileMenu compact /></div></header><main className="driver-content"><div className="driver-hero"><div><div className="eyebrow">Mobile sensing fleet</div><h1>Capture the city.</h1><p>Upload road imagery or footage from <strong>{profile?.bus_id || 'your assigned bus'}</strong> and send it to the intelligence pipeline.</p></div><div className="driver-status"><i /><span>Driver channel ready</span></div></div><div className="driver-grid"><section className="driver-upload-panel"><div className="driver-section-head"><div><div className="eyebrow">Field evidence</div><h2>Upload image or video</h2><p>Use JPG, PNG, MP4, MOV or WebM files up to 500 MB.</p></div><FileImage size={22} /></div><button className={`dropzone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onFile(event.dataTransfer.files?.[0]) }}><input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={(event) => onFile(event.target.files?.[0])} />{file ? <><span className="file-icon">{isImage ? <FileImage size={25} /> : <FileVideo size={25} />}</span><strong>{file.name}</strong><span>{(file.size / (1024 * 1024)).toFixed(1)} MB · Ready to upload</span><span className="dropzone-change">Choose a different file</span></> : <><span className="upload-icon"><CloudUpload size={28} /></span><strong>Drop image or video here</strong><span>Road-damage analysis will return annotated results</span></>}</button>{locationStatus && <div className="driver-location-status"><Activity size={15} />{locationStatus}</div>}{error && <div className="driver-error"><X size={15} />{error}</div>}{message && <div className="driver-success"><CheckCircle2 size={15} />{message}</div>}{analysis?.annotated_image_base64 && <div className="driver-annotation"><div><strong>Annotated image</strong><span>{analysis.summary?.total_detections ?? analysis.detections?.length ?? 0} model detections</span></div><img src={`data:${analysis.annotated_image_mime_type || 'image/jpeg'};base64,${analysis.annotated_image_base64}`} alt="Annotated road-damage detection" /></div>}{analysis?.annotated_video_base64 && <div className="driver-annotation"><div><strong>Annotated video</strong><span>{analysis.summary?.total_detections ?? analysis.detections?.length ?? 0} model detections</span></div><video controls playsInline preload="metadata" src={`data:${analysis.annotated_video_mime_type || 'video/mp4'};base64,${analysis.annotated_video_base64}`} /></div>}<button className="driver-upload-btn" onClick={upload} disabled={!file || busy}>{busy ? 'Uploading and analyzing...' : <><UploadCloud size={16} /> Upload for processing</>}</button></section><section className="driver-side-panel"><div className="driver-mini-card"><span><ShieldCheck size={17} /></span><div><strong>Secure handoff</strong><p>Files are stored in your private Supabase bucket and tagged to {profile?.bus_id || 'your bus'}.</p></div></div><div className="driver-mini-card"><span><Activity size={17} /></span><div><strong>What the model sees</strong><p>Road hazards, traffic conditions and safety incidents are extracted at the edge.</p></div></div><div className="driver-mini-card"><span><Clock3 size={17} /></span><div><strong>Latest handoffs</strong><p>Your recent uploads will appear here once processing history is connected.</p></div></div></section></div></main></div>
}
