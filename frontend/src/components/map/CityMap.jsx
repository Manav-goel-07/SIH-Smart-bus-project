import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Camera, CarFront, Crosshair, Layers3, Map as MapIcon, Minus, Plus, ShieldAlert, Siren, TrafficCone, TrainFront, UsersRound } from 'lucide-react'
import { coord, confidence, relativeTime, titleCase } from '../../utils/format'

const center = [28.6139, 77.209]
const layerDefaults = { traffic: true, incidents: true, cctv: true, fleet: true, pedestrian: true, signals: true, infrastructure: true }
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const numeric = (...values) => values.find((value) => value !== undefined && value !== null && Number.isFinite(Number(value)))
const congestionScore = (observation) => {
  const vehicleCount = numeric(observation.vehicle_count, observation.avg_vehicle_count, 0)
  const components = [{ value: clamp((Number(vehicleCount) - 15) / 35), weight: .55 }]
  const speed = numeric(observation.avg_speed, observation.average_speed, observation.speed)
  const delay = numeric(observation.current_delay, observation.delay_minutes, observation.delay)
  if (speed !== undefined) components.push({ value: clamp(1 - Number(speed) / 45), weight: .3 })
  if (delay !== undefined) components.push({ value: clamp(Number(delay) / 20), weight: .15 })
  const weight = components.reduce((sum, item) => sum + item.weight, 0)
  return components.reduce((sum, item) => sum + item.value * item.weight, 0) / weight
}
const congestionLevel = (observation) => { const score = congestionScore(observation); return score >= .66 ? 'HIGH' : score >= .36 ? 'MEDIUM' : 'LOW' }
const trafficColor = (value) => { const level = String(value || '').toLowerCase(); return level === 'high' ? '#ef4444' : level === 'medium' ? '#f5b942' : '#22c55e' }
const markerColor = (kind, value) => kind === 'incident' ? (String(value).toLowerCase() === 'high' ? '#ef4444' : '#f97316') : kind === 'fleet' ? '#2387e8' : kind === 'infrastructure' ? '#f97316' : '#4cc9f0'
const markerIcon = (kind, color) => L.divIcon({ className: 'urban-marker-host', html: `<span class="urban-marker marker-${kind}" style="--marker-color:${color}"><span class="urban-marker-glyph">${kind === 'fleet' ? '▰' : kind === 'cctv' ? '●' : kind === 'pedestrian' ? '⌁' : '!'}</span></span>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16] })

export default function CityMap({ incidents = [], roadIssues = [], hotspots = [], observations = [], height = '100%' }) {
  const [mapMode, setMapMode] = useState('map')
  const [layers, setLayers] = useState(layerDefaults)
  const [layersOpen, setLayersOpen] = useState(false)
  const fleet = useMemo(() => observations.filter((item) => item.location?.latitude && item.location?.longitude).slice(0, 16), [observations])
  const trafficRoutes = useMemo(() => {
    const grouped = observations.filter((item) => item.bus_id && item.location?.latitude && item.location?.longitude).reduce((result, observation) => { (result[observation.bus_id] ||= []).push(observation); return result }, {})
    return Object.entries(grouped).flatMap(([busId, readings]) => {
      const ordered = [...readings].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
      return ordered.slice(1).map((reading, index) => {
        const previous = ordered[index]
        const score = (congestionScore(previous) + congestionScore(reading)) / 2
        const level = score >= .66 ? 'HIGH' : score >= .36 ? 'MEDIUM' : 'LOW'
        return { id: `${busId}-${previous.id || index}-${reading.id || index + 1}`, busId, previous, reading, level, color: trafficColor(level), points: [[previous.location.latitude, previous.location.longitude], [reading.location.latitude, reading.location.longitude]] }
      })
    })
  }, [observations])
  const trafficHotspots = useMemo(() => hotspots.filter((item) => item.location?.latitude && item.location?.longitude).map((item) => ({ ...item, level: String(item.congestion_level || congestionLevel(item)).toUpperCase(), color: trafficColor(item.congestion_level || congestionLevel(item)) })), [hotspots])
  const incidentHotspots = useMemo(() => Object.values(incidents.filter((item) => item.location?.latitude && item.location?.longitude).reduce((groups, item) => { const key = `${Number(item.location.latitude).toFixed(3)}:${Number(item.location.longitude).toFixed(3)}`; groups[key] ||= { ...item, count: 0, latitude: item.location.latitude, longitude: item.location.longitude }; groups[key].count += item.status === 'RESOLVED' ? 0 : 1; return groups }, {})).filter((item) => item.count > 0), [incidents])
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  return <div className={`map-wrap urban-map map-${mapMode}`} style={{ height }}>
    <MapContainer center={center} zoom={12} zoomControl={false} scrollWheelZoom className="city-map">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url={tileUrl} />
      <MapControls />
      {layers.traffic && trafficRoutes.map((route) => <Polyline key={`traffic-${route.id}`} positions={route.points} pathOptions={{ color: route.color, weight: mapMode === 'heatmap' ? 7 : 5, opacity: .94, className: 'traffic-route' }}><Popup><TrafficPopup route={route} /></Popup></Polyline>)}
      {layers.traffic && trafficHotspots.map((hotspot, index) => <CircleMarker key={`traffic-node-${hotspot.id || index}`} center={[hotspot.location.latitude, hotspot.location.longitude]} radius={mapMode === 'heatmap' ? 17 : 11} pathOptions={{ color: hotspot.color, fillColor: hotspot.color, fillOpacity: mapMode === 'heatmap' ? .18 : .1, weight: 1 }}><Popup><TrafficPopup hotspot={hotspot} /></Popup></CircleMarker>)}
      {layers.incidents && incidentHotspots.map((hotspot, index) => <CircleMarker key={`hotspot-${hotspot.id || index}`} center={[hotspot.latitude, hotspot.longitude]} radius={22} pathOptions={{ color: markerColor('incident', hotspot.severity), fillColor: markerColor('incident', hotspot.severity), fillOpacity: .1, weight: 1, className: 'incident-glow' }} />)}
      {layers.incidents && incidents.filter((item) => item.location?.latitude && item.location?.longitude).map((item) => <Marker key={`incident-${item.id}`} position={[item.location.latitude, item.location.longitude]} icon={markerIcon('incident', markerColor('incident', item.severity))}><Popup><IncidentPopup incident={item} /></Popup></Marker>)}
      {layers.infrastructure && roadIssues.filter((item) => item.location?.latitude && item.location?.longitude).map((item) => <Marker key={`road-${item.id}`} position={[item.location.latitude, item.location.longitude]} icon={markerIcon('infrastructure', markerColor('infrastructure', item.severity))}><Popup><RoadPopup issue={item} /></Popup></Marker>)}
      {layers.fleet && fleet.map((item, index) => <Marker key={`fleet-${item.id || index}`} position={[item.location.latitude, item.location.longitude]} icon={markerIcon('fleet', markerColor('fleet'))}><Popup><FleetPopup observation={item} /></Popup></Marker>)}
    </MapContainer>
    <div className="map-topbar"><div className="map-mode-tabs">{[['map', MapIcon, 'Map View'], ['satellite', Layers3, 'Satellite'], ['heatmap', Siren, 'Heatmap']].map(([mode, Icon, label]) => <button key={mode} className={mapMode === mode ? 'active' : ''} onClick={() => setMapMode(mode)}><Icon size={13} />{label}</button>)}</div><div className="layer-menu"><button className={`all-layers ${layersOpen ? 'open' : ''}`} onClick={() => setLayersOpen((open) => !open)}><Layers3 size={14} /> All layers <span>⌄</span></button>{layersOpen && <div className="layer-dropdown">{Object.entries(layerLabels).map(([key, item]) => <LayerToggle key={key} label={item.label} icon={item.icon} color={item.color} checked={layers[key]} onChange={() => setLayers((previous) => ({ ...previous, [key]: !previous[key] }))} />)}</div>}</div></div>
    <div className="map-filter-row">{Object.entries(layerLabels).filter(([key]) => ['traffic', 'incidents', 'cctv', 'fleet', 'pedestrian', 'signals'].includes(key)).map(([key, item]) => <button key={key} className={`map-filter ${layers[key] ? 'selected' : ''}`} onClick={() => setLayers((previous) => ({ ...previous, [key]: !previous[key] }))}><item.icon size={13} />{item.label}</button>)}</div>
    <div className="map-legend"><div className="legend-title">Traffic state</div><LegendItem color="#22c55e" label="Smooth traffic" /><LegendItem color="#f5b942" label="Moderate" /><LegendItem color="#ef4444" label="Heavy congestion" /><div className="legend-divider" /><div className="legend-title">Assets</div><LegendAsset icon={TrainFront} label="Bus / fleet" /><LegendAsset icon={Camera} label="CCTV camera" /><LegendAsset icon={TrafficCone} label="Traffic signal" /><LegendAsset icon={ShieldAlert} label="Incident" /></div>
    <div className="map-zoom-controls"><button onClick={() => window.dispatchEvent(new CustomEvent('urbaneye-map-zoom', { detail: 'out' }))} title="Zoom out"><Minus size={16} /></button><button onClick={() => window.dispatchEvent(new CustomEvent('urbaneye-map-recenter'))} title="Recenter map"><Crosshair size={16} /></button><button onClick={() => window.dispatchEvent(new CustomEvent('urbaneye-map-zoom', { detail: 'in' }))} title="Zoom in"><Plus size={16} /></button></div>
    <div className="map-scale">Delhi NCR <span>·</span> {trafficRoutes.length + trafficHotspots.length + incidents.length + roadIssues.length + fleet.length} active signals</div>
  </div>
}

const layerLabels = { traffic: { label: 'Traffic', icon: CarFront, color: '#22c55e' }, incidents: { label: 'Incidents', icon: ShieldAlert, color: '#ef4444' }, cctv: { label: 'CCTV', icon: Camera, color: '#a78bfa' }, fleet: { label: 'Fleet', icon: TrainFront, color: '#2387e8' }, pedestrian: { label: 'Pedestrian zones', icon: UsersRound, color: '#4cc9f0' }, signals: { label: 'Signals', icon: TrafficCone, color: '#f5b942' }, infrastructure: { label: 'Infrastructure', icon: TrafficCone, color: '#f97316' } }
function MapControls() { const map = useMap(); useEffect(() => { const zoom = (event) => event.detail === 'in' ? map.zoomIn() : map.zoomOut(); const recenter = () => map.setView(center, 12, { animate: true }); window.addEventListener('urbaneye-map-zoom', zoom); window.addEventListener('urbaneye-map-recenter', recenter); return () => { window.removeEventListener('urbaneye-map-zoom', zoom); window.removeEventListener('urbaneye-map-recenter', recenter) } }, [map]); return null }
function LayerToggle({ label, icon: Icon, color, checked, onChange }) { return <button className="layer-dropdown-item" onClick={onChange}><Icon size={13} style={{ color }} /><span>{label}</span><i className={`mini-toggle ${checked ? 'checked' : ''}`}><em /></i></button> }
function LegendItem({ color, label }) { return <div className="legend-item"><i style={{ background: color }} />{label}</div> }
function LegendAsset({ icon: Icon, label }) { return <div className="legend-item"><Icon size={12} />{label}</div> }
function PopupShell({ eyebrow, title, children }) { return <div className="map-popup"><div className="popup-eyebrow">{eyebrow}</div><strong>{title}</strong>{children}</div> }
function PopupLine({ label, value }) { return <div className="popup-line"><span>{label}</span><b>{value || '—'}</b></div> }
function IncidentPopup({ incident }) { return <PopupShell eyebrow="Incident hotspot" title={titleCase(incident.incident_type)}><PopupLine label="Location" value={coord(incident.location)} /><PopupLine label="Severity" value={titleCase(incident.severity)} /><PopupLine label="Time" value={relativeTime(incident.timestamp)} /><PopupLine label="Confidence" value={confidence(incident.confidence)} /></PopupShell> }
function TrafficPopup({ hotspot, route }) { const source = hotspot || route?.reading || {}; const level = hotspot?.level || route?.level; const speed = numeric(source.avg_speed, source.average_speed, source.speed); const delay = numeric(source.current_delay, source.delay_minutes, source.delay); return <PopupShell eyebrow="Traffic condition" title={`${titleCase(level)} traffic`}><PopupLine label="Location" value={coord(source.location)} />{route && <PopupLine label="Bus path" value={route.busId} />}<PopupLine label="Vehicles" value={source.avg_vehicle_count ?? source.vehicle_count} /><PopupLine label="Avg speed" value={speed === undefined ? 'Not reported' : `${speed} km/h`} /><PopupLine label="Current delay" value={delay === undefined ? 'Not reported' : `${delay} min`} /><PopupLine label="Buses" value={source.unique_bus_count} /></PopupShell> }
function RoadPopup({ issue }) { return <PopupShell eyebrow="Infrastructure signal" title={titleCase(issue.issue_type)}><PopupLine label="Location" value={coord(issue.location)} /><PopupLine label="Severity" value={titleCase(issue.severity)} /><PopupLine label="Detections" value={issue.detection_count} /><PopupLine label="Confidence" value={confidence(issue.max_confidence)} /></PopupShell> }
function FleetPopup({ observation }) { return <PopupShell eyebrow="Live fleet sensor" title={observation.bus_id}><PopupLine label="Vehicles" value={observation.vehicle_count} /><PopupLine label="Time" value={relativeTime(observation.timestamp)} /><PopupLine label="Location" value={coord(observation.location)} /></PopupShell> }
