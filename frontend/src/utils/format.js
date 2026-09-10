export const titleCase = (value = '') => String(value).toLowerCase().split(/[_\s-]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
export const shortTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value)) : 'Awaiting signal'
export const relativeTime = (value) => { if (!value) return 'Awaiting signal'; const diff = Math.max(0, Date.now() - new Date(value).getTime()); const min = Math.floor(diff / 60000); if (min < 1) return 'Just now'; if (min < 60) return `${min}m ago`; const hours = Math.floor(min / 60); return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago` }
export const confidence = (value) => value == null ? '—' : `${Math.round(Number(value) * 100)}%`
export const coord = (location) => location ? `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}` : 'Location unavailable'
