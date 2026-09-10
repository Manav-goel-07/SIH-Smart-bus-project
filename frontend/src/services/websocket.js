export function createRealtimeSocket(onMessage, onStatus) {
  const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
  const wsUrl = base.replace(/^http/, 'ws') + '/ws'
  let socket
  let retryTimer
  let stopped = false

  const connect = () => {
    if (stopped) return
    try {
      socket = new WebSocket(wsUrl)
      onStatus?.('connecting')
      socket.onopen = () => onStatus?.('connected')
      socket.onmessage = (event) => {
        try { onMessage?.(JSON.parse(event.data)) } catch { /* Ignore malformed broadcasts. */ }
      }
      socket.onerror = () => onStatus?.('disconnected')
      socket.onclose = () => {
        onStatus?.('disconnected')
        if (!stopped) retryTimer = window.setTimeout(connect, 4000)
      }
    } catch { onStatus?.('disconnected') }
  }
  connect()
  return () => { stopped = true; window.clearTimeout(retryTimer); socket?.close() }
}
