import { useState, useEffect, useRef } from 'react';

const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) return;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (message) => {
      console.log('WebSocket Message:', message);
      setLastMessage(message);
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const sendMessage = (message: string | object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const dataToSend = typeof message === 'string' ? message : JSON.stringify(message);
      ws.current.send(dataToSend);
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  return { isConnected, lastMessage, sendMessage };
};

export default useWebSocket;