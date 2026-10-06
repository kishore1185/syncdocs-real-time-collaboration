import { useEffect, useRef, useState, useCallback } from 'react';
import { tokenStore } from '../lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CollaborationStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

interface CollaborationTestMessage {
  message: string;
  from: string;
  userId: string;
  timestamp: number;
}

interface UseCollaborationOptions {
  documentId: string | null;
  pageId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCollaboration({ documentId, pageId }: UseCollaborationOptions) {
  const [status, setStatus] = useState<CollaborationStatus>('idle');
  const [lastTestMessage, setLastTestMessage] = useState<CollaborationTestMessage | null>(null);

  // Use refs to track the exact socket instance and prevent StrictMode duplicates
  const wsRef = useRef<WebSocket | null>(null);
  const cleanupCalledRef = useRef(false);

  const sendTestMessage = useCallback((message: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[COLLAB] Cannot send: WebSocket not open');
      return;
    }
    ws.send(JSON.stringify({
      type: 'collaboration:test',
      payload: { message },
    }));
    console.log(`[COLLAB] Sent test message: "${message}"`);
  }, []);

  useEffect(() => {
    // Guard: don't connect without required values
    if (!documentId || !pageId) {
      setStatus('idle');
      return;
    }

    const token = tokenStore.get();
    if (!token) {
      setStatus('error');
      console.error('[COLLAB] No auth token available');
      return;
    }

    // Prevent duplicate connections from StrictMode re-runs
    cleanupCalledRef.current = false;

    // Build WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = 'localhost:4000';
    const wsUrl = `${wsProtocol}//${wsHost}/collaboration?token=${encodeURIComponent(token)}&documentId=${encodeURIComponent(documentId)}&pageId=${encodeURIComponent(pageId)}`;

    console.log(`[COLLAB] Connecting: doc=${documentId} page=${pageId}`);
    setStatus('connecting');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // If cleanup was already called (StrictMode unmounted us), close immediately
      if (cleanupCalledRef.current) {
        ws.close();
        return;
      }
      console.log(`[COLLAB] Connected: doc=${documentId} page=${pageId}`);
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'collaboration:test') {
          const payload = msg.payload as CollaborationTestMessage;
          console.log(`[COLLAB] Test message from ${payload.from}: "${payload.message}"`);
          setLastTestMessage(payload);
        }
      } catch (err) {
        console.warn('[COLLAB] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.log(`[COLLAB] Disconnected: doc=${documentId} page=${pageId}`);
      if (!cleanupCalledRef.current) {
        setStatus('disconnected');
      }
    };

    ws.onerror = (err) => {
      console.error('[COLLAB] WebSocket error:', err);
      if (!cleanupCalledRef.current) {
        setStatus('error');
      }
    };

    // Cleanup: close the EXACT socket instance we created
    return () => {
      cleanupCalledRef.current = true;
      console.log(`[COLLAB] Cleanup: closing socket for doc=${documentId} page=${pageId}`);
      ws.close();
      wsRef.current = null;
    };
  }, [documentId, pageId]);

  return {
    status,
    lastTestMessage,
    sendTestMessage,
  };
}
