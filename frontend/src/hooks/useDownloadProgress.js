import { useState, useEffect, useRef, useCallback } from 'react';

export default function useDownloadProgress(clientId) {
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isIntentionallyClosedRef = useRef(false);

  const connect = useCallback(() => {
    if (!clientId) return;
    
    // Pulisce eventuali timer di riconnessione in sospeso
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    isIntentionallyClosedRef.current = false;
    
    // Punta direttamente al backend in ambiente locale
    const wsUrl = `ws://localhost:8000/ws/progress/${clientId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'error') {
          setError('Si è verificato un errore fatale lato server durante il download.');
        } else {
          // Aggiorniamo i dati (progress, speed, total_size, eta)
          setProgress(data);
        }
      } catch (e) {
        console.error('Errore nel parsing del messaggio WS:', e);
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket Error:', e);
    };

    ws.onclose = () => {
      setIsConnected(false);
      
      // Riconnessione automatica solo se la disconnessione è stata accidentale
      if (!isIntentionallyClosedRef.current && clientId) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000); // Riprova dopo 3 secondi
      }
    };
  }, [clientId]);

  // Gestione dell'avvio e dello smontaggio
  useEffect(() => {
    connect();

    return () => {
      isIntentionallyClosedRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Reset esplicito che chiude le connessioni e sbianca gli stati
  const reset = useCallback(() => {
    isIntentionallyClosedRef.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
    setProgress(null);
    setError(null);
  }, []);

  return { isConnected, progress, error, reset };
}
