import { useEffect, useMemo, useState } from 'react'
import { BusFront, Clock3, LocateFixed, LogOut, MapPin, Navigation, RefreshCw, Route, UserRound } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useAuth } from '../auth/AuthProvider'
import { useFleetData } from '../hooks/useFleetData'
import transitData from '../data/delhiTransit.json'

const cityCenter = [28.6139, 77.209]
const busIcon = L.divIcon({ className: 'rider-bus-marker', html: `<span class="rider-bus-glyph">${renderToStaticMarkup(<BusFront size={18} strokeWidth={2.5} />)}</span>`, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -17] })
const number = (...values) => values.find((value) => value !== undefined && value !== null && Number.isFinite(Number(value)))
const haversineKm = (a, b) => { const earth = 6371; const dLat = (b[0] - a[0]) * Math.PI / 180; const dLon = (b[1] - a[1]) * Math.PI / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) }
const timeLabel = (minutes) => minutes < 1 ? '<1 min' : `${Math.ceil(minutes)} min`
const delayValue = (bus) => number(bus?.current_delay, bus?.delay_minutes, bus?.delay)
const speedValue = (bus) => number(bus?.avg_speed, bus?.average_speed, bus?.speed)
const prototypeFleet = [
  'DL-1P-4582', 'DL-1P-1178', 'DL-1P-9021', 'DL-1P-3394', 'DL-1PC-6421',
  'DL-1PD-8710', 'DL-1P-2214', 'DL-1P-5148', 'DL-1P-7630', 'DL-1P-4086',
  'DL-1PD-1267', 'DL-1PC-9054', 'DL-1P-6319', 'DL-1P-7752', 'DL-1PC-2946',
  'DL-1P-8305', 'DL-1PD-5172', 'DL-1P-2864', 'DL-1PC-7481', 'DL-1P-5907',
  'DL-1PD-4038', 'DL-1P-1685', 'DL-1PC-8326', 'DL-1P-9470',
].map((id, index) => ({ id, routeIndex: index, offset: (index * 3) % 13 }))

export default function RiderDashboard() {
  const { profile, signOut } = useAuth()
  const { observations, loading, error, refresh, realtimeStatus } = useFleetData()
  const [busId, setBusId] = useState('')
  const [startId, setStartId] = useState('')
  const [endId, setEndId] = useState('')

  const buses = useMemo(() => Object.values(observations.filter((item) => item.bus_id && item.location?.latitude && item.location?.longitude).reduce((groups, item) => { const current = groups[item.bus_id]; if (!current || new Date(item.timestamp || 0) > new Date(current.timestamp || 0)) groups[item.bus_id] = item; return groups }, {})), [observations])
  const stops = transitData.stops
  const routes = transitData.routes
  const places = useMemo(() => stops.map((stop) => ({ id: String(stop.id), label: stop.name, point: [stop.lat, stop.lon] })), [stops])
  const selectedStart = places.find((place) => place.id === startId)
  const selectedEnd = places.find((place) => place.id === endId)
  const reachableEndIds = useMemo(() => {
    if (!startId) return new Set()
    return new Set(routes.flatMap((route) => {
      const startIndex = route.stops.indexOf(startId)
      return startIndex >= 0 ? route.stops.slice(startIndex + 1) : []
    }))
  }, [routes, startId])
  const availableEndPlaces = useMemo(() => startId ? places.filter((place) => reachableEndIds.has(place.id)) : places, [places, reachableEndIds, startId])
  useEffect(() => {
    if (startId && endId && !reachableEndIds.has(endId)) setEndId('')
  }, [startId, endId, reachableEndIds])
  const matchingRoutes = useMemo(() => {
    if (!startId || !endId || startId === endId) return []
    return routes.filter((route) => { const startIndex = route.stops.indexOf(startId); const endIndex = route.stops.indexOf(endId); return startIndex >= 0 && endIndex > startIndex }).slice(0, 12)
  }, [routes, startId, endId])
  const routeDistance = selectedStart && selectedEnd ? haversineKm(selectedStart.point, selectedEnd.point) : 0
  const scheduledFleet = useMemo(() => prototypeFleet.map((vehicle) => ({ ...vehicle, route: routes[vehicle.routeIndex % routes.length] })).filter((vehicle) => vehicle.route), [routes])
  const stopLookup = useMemo(() => Object.fromEntries(stops.map((stop) => [String(stop.id), stop])), [stops])
  const prototypeBusLocations = useMemo(() => scheduledFleet.slice(0, 18).map((vehicle) => {
    const stopId = vehicle.route.stops[(vehicle.offset * 2) % vehicle.route.stops.length]
    const stop = stopLookup[stopId]
    return stop ? { ...vehicle, point: [stop.lat, stop.lon] } : null
  }).filter(Boolean), [scheduledFleet, stopLookup])
  const viableBuses = useMemo(() => matchingRoutes.flatMap((route, routeIndex) => {
    const assigned = scheduledFleet.filter((vehicle) => vehicle.route.id === route.id)
    const candidates = assigned.length ? assigned : [{ id: prototypeFleet[(routeIndex + 16) % prototypeFleet.length].id, route, offset: routeIndex + 2, prototype: true }]
    return candidates.map((vehicle) => {
      const scheduleSpeed = 22 + ((vehicle.offset + routeIndex) % 5)
      const eta = routeDistance ? (routeDistance / scheduleSpeed) * 60 + vehicle.offset : 0
      return { ...vehicle, scheduleSpeed, eta }
    })
  }).sort((a, b) => a.eta - b.eta), [matchingRoutes, routeDistance, scheduledFleet])
  const selectedLiveBus = buses.find((bus) => bus.bus_id === busId)
  const selectedCandidate = viableBuses.find((bus) => bus.id === busId)
  const selectedBus = selectedLiveBus || selectedCandidate || buses[0]
  const liveSpeed = speedValue(selectedBus)
  const effectiveSpeed = liveSpeed || 24
  const delay = delayValue(selectedBus)
  const etaMinutes = routeDistance ? (routeDistance / effectiveSpeed) * 60 + (delay || 0) : 0
  const hasReportedSpeed = liveSpeed !== undefined

  const chooseBus = (value) => {
    setBusId(value)
    const next = buses.find((bus) => bus.bus_id === value)
    if (!next) return
  }

  return <div className="rider-shell"><header className="rider-topbar"><div className="rider-brand"><span className="rider-logo"><img src="/sih-logo.png" alt="SIH logo" /></span><div><strong>UrbanEye</strong><span>Passenger view</span></div></div><div className="rider-user"><span><UserRound size={15} /> {profile?.full_name || 'Rider'}</span><button className="rider-icon-btn" onClick={signOut} title="Sign out"><LogOut size={16} /></button></div></header><main className="rider-content"><div className="rider-heading"><div><div className="eyebrow">Live bus network</div><h1>Find your bus.</h1><p>Choose real Delhi bus stops, see routes serving both, and estimate your arrival.</p></div><div className={`rider-live ${realtimeStatus === 'connected' ? 'online' : ''}`}><i /> {realtimeStatus === 'connected' ? 'Live updates on' : 'Latest updates'}</div></div><section className="rider-layout"><div className="rider-map-panel"><div className="rider-map-head"><div><strong>Live fleet map</strong><span>{buses.length} live · {prototypeBusLocations.length} scheduled demo buses · {stops.length} scheduled stops</span></div><button className="rider-refresh" onClick={refresh} disabled={loading} title="Refresh live buses"><RefreshCw size={15} className={loading ? 'spin' : ''} /></button></div><div className="rider-map"><MapContainer center={cityCenter} zoom={12} zoomControl className="city-map"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{prototypeBusLocations.map((vehicle) => <Marker key={`scheduled-${vehicle.id}`} position={vehicle.point} icon={busIcon}><Popup><strong>{vehicle.id}</strong><br />Scheduled demo vehicle<br />Route {vehicle.route.name || vehicle.route.id}</Popup></Marker>)}{buses.map((bus) => <Marker key={bus.bus_id} position={[bus.location.latitude, bus.location.longitude]} icon={busIcon}><Popup><strong>{bus.bus_id}</strong><br />Live location<br />{delayValue(bus) == null ? 'Delay not reported' : `${delayValue(bus)} min delay`}</Popup></Marker>)}{selectedStart && selectedEnd && <><Polyline positions={[selectedStart.point, selectedEnd.point]} pathOptions={{ color: '#38bdf8', weight: 4, dashArray: '8 8' }} /><CircleMarker center={selectedStart.point} radius={8} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: .9 }} /><CircleMarker center={selectedEnd.point} radius={8} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: .9 }} /></>}<MapFit points={[...prototypeBusLocations.map((bus) => bus.point), ...buses.map((bus) => [bus.location.latitude, bus.location.longitude]), ...(selectedStart ? [selectedStart.point] : []), ...(selectedEnd ? [selectedEnd.point] : [])]} /></MapContainer>{!buses.length && !prototypeBusLocations.length && <div className="rider-map-empty"><BusFront size={22} /><strong>Waiting for bus locations</strong><span>Bus positions will appear when observations arrive.</span></div>}</div></div><aside className="rider-trip-panel"><div className="rider-card-title"><div><div className="eyebrow">Journey planner</div><h2>Plan your route</h2></div><Route size={20} /></div><label className="rider-field"><span>Live bus number</span><select value={selectedBus?.bus_id || ''} onChange={(event) => chooseBus(event.target.value)}><option value="">Any reporting bus</option>{buses.map((bus) => <option key={bus.bus_id} value={bus.bus_id}>{bus.bus_id}</option>)}</select></label><label className="rider-field"><span><MapPin size={13} /> Starting stop</span><select value={selectedStart?.id || ''} onChange={(event) => setStartId(event.target.value)}><option value="">Select a Delhi bus stop</option>{places.map((place) => <option key={place.id} value={place.id}>{place.label}</option>)}</select></label><label className="rider-field"><span><Navigation size={13} /> Ending stop <small className="rider-field-hint">{startId ? `${availableEndPlaces.length} direct stops` : 'Choose start first'}</small></span><select value={selectedEnd?.id || ''} onChange={(event) => setEndId(event.target.value)}><option value="">{startId ? 'Select a direct-route stop' : 'Select a Delhi bus stop'}</option>{availableEndPlaces.map((place) => <option key={place.id} value={place.id}>{place.label}</option>)}</select></label>{selectedBus && <div className="rider-bus-status"><div><BusFront size={17} /><strong>{selectedBus.bus_id || selectedBus.id}</strong><span>{selectedBus.location ? 'Live position' : 'Scheduled route estimate'}</span></div><div className="rider-status-grid"><span>Delay<strong>{delay == null ? 'Not reported' : `${delay} min`}</strong></span><span>Speed<strong>{liveSpeed == null ? (selectedCandidate ? `${selectedCandidate.scheduleSpeed} km/h est.` : 'Not reported') : `${liveSpeed} km/h`}</strong></span></div></div>}{routeDistance > 0 ? <div className="rider-eta"><div><Clock3 size={18} /><span>Estimated journey</span></div><strong>{timeLabel(etaMinutes)}</strong><small>{routeDistance.toFixed(1)} km · {delay ? `${delay} min live delay included` : hasReportedSpeed ? 'Based on live speed' : 'Estimated at 24 km/h until live speed arrives'}</small></div> : <div className="rider-eta rider-eta-empty"><LocateFixed size={18} /><span>Select two stops to calculate the journey estimate.</span></div>}<div className="rider-routes"><div className="rider-routes-head"><strong>Direct scheduled routes</strong><span>{matchingRoutes.length}</span></div>{matchingRoutes.length ? matchingRoutes.map((route) => <div className="rider-route" key={route.id}><span className="route-badge">{route.name || route.id}</span><small>{route.stops.indexOf(startId) + 1} stops from origin · Delhi GTFS schedule</small></div>) : <p>Select two stops to see scheduled routes serving both positions.</p>}</div><div className="rider-bus-results"><div className="rider-routes-head"><strong>Viable buses for this trip</strong><span>{viableBuses.length}</span></div>{viableBuses.length ? viableBuses.map((vehicle, index) => <button className={`rider-bus-result ${index === 0 ? 'first' : ''}`} key={`${vehicle.id}-${vehicle.route.id}`} onClick={() => setBusId(vehicle.id)}><span className="rider-bus-result-main"><BusFront size={14} /><strong>{vehicle.id}</strong><small>{vehicle.route.name || vehicle.route.id}</small></span><span className="rider-bus-result-eta">{timeLabel(vehicle.eta)}{index === 0 && <em>Arrives first</em>}</span></button>) : <p>Enter a starting and ending stop to see every bus serving that direction.</p>}</div><div className="rider-note">Schedules come from Delhi Open Transit Data GTFS. Bus IDs are prototype fleet records for this demo; arrival order is a route-distance and schedule estimate until a live vehicle is linked to its route.</div></aside></section>{error && <div className="rider-error">{error}</div>}</main></div>
}

function MapFit({ points }) { const map = useMap(); const signature = points.map((point) => point.join(',')).join('|'); useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 13 }) }, [map, signature]); return null }
