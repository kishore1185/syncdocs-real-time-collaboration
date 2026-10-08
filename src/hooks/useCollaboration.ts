import { useEffect, useRef, useState, useCallback } from 'react';
import { tokenStore } from '../lib/api';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

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

export interface PageBorderUpdate {
  pageId: string;
  borderStyle: string;
  borderWidth: string;
  borderColor: string;
}

interface UseCollaborationOptions {
  documentId: string | null;
  pageId: string | null;
  initialYstateBase64?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCollaboration({ documentId, pageId, initialYstateBase64 }: UseCollaborationOptions) {
  const [status, setStatus] = useState<CollaborationStatus>('idle');
  const [lastTestMessage, setLastTestMessage] = useState<CollaborationTestMessage | null>(null);
  const [lastPageBorderUpdate, setLastPageBorderUpdate] = useState<PageBorderUpdate | null>(null);
  const [ydocState, setYdocState] = useState<{ doc: Y.Doc, awareness: awarenessProtocol.Awareness, pageId: string } | null>(null);

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

  const sendPageBorderUpdate = useCallback((payload: PageBorderUpdate) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'page-border-updated',
      payload,
    }));
  }, []);

  useEffect(() => {
    // Guard: don't connect without required values
    if (!documentId || !pageId) {
      setStatus('idle');
      setYdocState(null);
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
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    const doc = new Y.Doc();
    
    if (initialYstateBase64) {
      try {
        const binaryString = atob(initialYstateBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        Y.applyUpdate(doc, bytes);
        console.log(`[COLLAB] Restored persisted Yjs state for page=${pageId}`);
      } catch (err) {
        console.error('[COLLAB] Failed to restore persisted Yjs state:', err);
      }
    }

    const awareness = new awarenessProtocol.Awareness(doc);
    setYdocState({ doc, awareness, pageId });

    const handleUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== 'websocket' && ws.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0); // message type 0 for sync
        syncProtocol.writeUpdate(encoder, update);
        ws.send(encoding.toUint8Array(encoder));
      }
    };
    doc.on('update', handleUpdate);

    const handleAwarenessUpdate = ({ added, updated, removed }: any, origin: any) => {
      if (origin !== 'websocket' && ws.readyState === WebSocket.OPEN) {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1); // message type 1 for awareness
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
        encoding.writeVarUint8Array(encoder, awarenessUpdate);
        ws.send(encoding.toUint8Array(encoder));
      }
    };
    awareness.on('update', handleAwarenessUpdate);

    const handleBeforeUnload = () => {
      if (ws.readyState === WebSocket.OPEN) {
        awarenessProtocol.removeAwarenessStates(awareness, [awareness.clientID], 'window unload');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    ws.onopen = () => {
      // If cleanup was already called (StrictMode unmounted us), close immediately
      if (cleanupCalledRef.current) {
        ws.close();
        return;
      }
      console.log(`[COLLAB] Connected: doc=${documentId} page=${pageId}`);
      setStatus('connected');

      // Request initial state from peers (SyncStep1)
      const syncEncoder = encoding.createEncoder();
      encoding.writeVarUint(syncEncoder, 0); // message type 0 for sync
      syncProtocol.writeSyncStep1(syncEncoder, doc);
      ws.send(encoding.toUint8Array(syncEncoder));

      // Broadcast our local awareness state
      if (awareness.getLocalState() !== null) {
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, 1);
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID]);
        encoding.writeVarUint8Array(awarenessEncoder, awarenessUpdate);
        ws.send(encoding.toUint8Array(awarenessEncoder));
      }
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary message
        const decoder = decoding.createDecoder(new Uint8Array(event.data));
        const messageType = decoding.readVarUint(decoder);
        
        if (messageType === 0) {
          // Yjs sync
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0);
          
          const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, 'websocket');
          
          // If we received SyncStep1, readSyncMessage wrote SyncStep2 to our encoder.
          // We need to send it back.
          if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
            if (encoding.length(encoder) > 1 && ws.readyState === WebSocket.OPEN) {
              ws.send(encoding.toUint8Array(encoder));
            }
            
            // The peer that sent SyncStep1 just joined. They missed our awareness state.
            // Send them our local awareness state so they see our cursor/presence immediately.
            if (awareness.getLocalState() !== null && ws.readyState === WebSocket.OPEN) {
              const awarenessEncoder = encoding.createEncoder();
              encoding.writeVarUint(awarenessEncoder, 1); // message type 1 for awareness
              const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID]);
              encoding.writeVarUint8Array(awarenessEncoder, awarenessUpdate);
              ws.send(encoding.toUint8Array(awarenessEncoder));
            }
          }
        } else if (messageType === 1) {
          // Awareness
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(awareness, update, 'websocket');
        }
      } else {
        // Text message
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'collaboration:test') {
            const payload = msg.payload as CollaborationTestMessage;
            console.log(`[COLLAB] Test message from ${payload.from}: "${payload.message}"`);
            setLastTestMessage(payload);
          } else if (msg.type === 'page-border-updated') {
            setLastPageBorderUpdate(msg.payload as PageBorderUpdate);
          }
        } catch (err) {
          console.warn('[COLLAB] Failed to parse message:', err);
        }
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
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Explicitly broadcast our departure to remote clients before closing
      if (ws.readyState === WebSocket.OPEN) {
        awarenessProtocol.removeAwarenessStates(awareness, [awareness.clientID], 'window unload');
      }

      awareness.off('update', handleAwarenessUpdate);
      awareness.destroy();
      doc.off('update', handleUpdate);
      doc.destroy();
      ws.close();
      wsRef.current = null;
    };
  }, [documentId, pageId]);

  return {
    status,
    lastTestMessage,
    lastPageBorderUpdate,
    sendTestMessage,
    sendPageBorderUpdate,
    ydoc: ydocState?.pageId === pageId ? ydocState.doc : null,
    awareness: ydocState?.pageId === pageId ? ydocState.awareness : null,
  };
}

