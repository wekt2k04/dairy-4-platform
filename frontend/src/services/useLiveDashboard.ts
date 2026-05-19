import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveCowUpdate } from '../types';
import { getWebSocketUrl } from './api';

interface UseLiveDashboardOptions {
  maxItems?: number;
}

export function useLiveDashboard({ maxItems = 100 }: UseLiveDashboardOptions = {}) {
  const [latestUpdates, setLatestUpdates] = useState<Record<string, LiveCowUpdate>>({});
  const [history, setHistory] = useState<LiveCowUpdate[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(async () => {
    const url = await getWebSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data: LiveCowUpdate[] = JSON.parse(event.data);
        if (!Array.isArray(data)) return;

        setLatestUpdates((prev) => {
          const next = { ...prev };
          for (const update of data) {
            next[update.cow_id] = update;
          }
          return next;
        });

        setHistory((prev) => {
          const next = [...prev, ...data];
          if (next.length > maxItems) {
            return next.slice(next.length - maxItems);
          }
          return next;
        });
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      ws.close();
    };
  }, [maxItems]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const getCowUpdate = useCallback(
    (cowId: string): LiveCowUpdate | undefined => latestUpdates[cowId],
    [latestUpdates],
  );

  const getAllCowIds = useCallback((): string[] => Object.keys(latestUpdates), [latestUpdates]);

  return {
    connected,
    error,
    latestUpdates,
    history,
    getCowUpdate,
    getAllCowIds,
  };
}
