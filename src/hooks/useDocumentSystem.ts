import { useEffect, useRef } from 'react';
import { tokenStore } from '../lib/api';

export function useDocumentSystem(documentId: string | null, onEvent: (event: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!documentId) return;
    const token = tokenStore.get();
    if (!token) return;

    let cleanupCalled = false;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      if (cleanupCalled) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = 'localhost:4000';
      const wsUrl = `${wsProtocol}//${wsHost}/collaboration?token=${encodeURIComponent(token)}&documentId=${encodeURIComponent(documentId)}&pageId=system`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            onEventRef.current(msg);
          } catch (err) {
            console.warn('[SYSTEM] Failed to parse message', err);
          }
        }
      };

      ws.onopen = () => {
        if (cleanupCalled) {
          ws.close();
          return;
        }
        console.log(`[SYSTEM] Connected: doc=${documentId}`);
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };

      ws.onclose = () => {
        console.log(`[SYSTEM] Disconnected: doc=${documentId}`);
        if (!cleanupCalled) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      cleanupCalled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [documentId]);
}
