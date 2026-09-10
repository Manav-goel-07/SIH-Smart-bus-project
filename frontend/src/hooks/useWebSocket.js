import { useEffect, useState } from 'react'
import { createRealtimeSocket } from '../services/websocket'

export function useWebSocket(onMessage) {
  const [status, setStatus] = useState('connecting')
  useEffect(() => createRealtimeSocket(onMessage, setStatus), [onMessage])
  return status
}
