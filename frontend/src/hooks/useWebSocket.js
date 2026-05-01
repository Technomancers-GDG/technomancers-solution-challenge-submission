import { useEffect, useRef, useState } from "react";

export function useWebSocket({
  endpoint,
  onMessage,
  reconnectDelayMs = 2500,
  pingIntervalMs = 15000,
  staleMs = 30000,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pingTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    function clearTimers() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (pingTimerRef.current) {
        window.clearInterval(pingTimerRef.current);
      }
    }

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}${endpoint}`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) {
          return;
        }
        setIsConnected(true);
        pingTimerRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send("ping");
          }
        }, pingIntervalMs);
      };

      socket.onmessage = (event) => {
        if (!isMounted) {
          return;
        }
        setLastMessageAt(Date.now());
        onMessage?.(event);
      };

      socket.onclose = () => {
        if (!isMounted) {
          return;
        }
        setIsConnected(false);
        clearTimers();
        reconnectTimerRef.current = window.setTimeout(connect, reconnectDelayMs);
      };

      socket.onerror = () => {
        if (!isMounted) {
          return;
        }
        setIsConnected(false);
      };
    }

    connect();

    return () => {
      isMounted = false;
      clearTimers();
      socketRef.current?.close();
    };
  }, [endpoint, onMessage, pingIntervalMs, reconnectDelayMs]);

  const isStale = lastMessageAt ? Date.now() - lastMessageAt > staleMs : false;

  return {
    isConnected,
    lastMessageAt,
    isStale,
    socket: socketRef.current,
  };
}
