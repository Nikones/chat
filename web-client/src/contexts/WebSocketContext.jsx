import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { WS_URL } from '../config'; // Импортируем URL из конфигурации

// Константы для WebSocket
const WS_TYPES = {
  MESSAGE: 'message',
  TYPING: 'typing',
  READ: 'read',
  ERROR: 'error',
  DEBUG: 'debug', // Добавляем тип сообщения для отладки
  PING: 'ping',
  PONG: 'pong',
};

// Создаем контекст с начальными значениями
const WebSocketContext = createContext({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  lastMessage: null,
  ready: false,
  error: null
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    console.error('useWebSocket должен использоваться внутри WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [ready, setReady] = useState(false);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const connectTimeoutRef = useRef(null);
  
  const maxReconnectAttempts = 5;
  const pingInterval = 30000; 
  const connectionTimeout = 10000;
  
  const getWebSocketUrl = useCallback(() => {
    if (!token) return null;
    return `${WS_URL}?token=${encodeURIComponent(token)}`;
  }, [token]);
  
  const sendMessage = useCallback((type, payload = {}) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocketContext: Попытка отправить сообщение без активного соединения');
      return false;
    }
    
    try {
      const message = typeof type === 'object' ? type : { type, payload };
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('WebSocketContext: Ошибка при отправке сообщения', error);
      return false;
    }
  }, []);
  
  const sendPing = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendMessage(WS_TYPES.PING, { timestamp: Date.now() });
    }
  }, [sendMessage]);
  
  const cleanup = useCallback(() => {
    console.log('WebSocketContext: Очистка ресурсов');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        console.error('WebSocketContext: Ошибка при закрытии соединения', e);
      }
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setReady(false);
  }, []);
  
  const connect = useCallback(() => {
    if (socketRef.current) {
      console.log('WebSocketContext: Попытка подключения при существующем сокете, пропуск.');
      return;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      console.error('WebSocketContext: Не удалось сформировать URL для WebSocket (нет токена?)');
      return;
    }
    
    console.log('WebSocketContext: Попытка подключения к WebSocket', {
      url: WS_URL,
      tokenLength: token?.length || 0,
      attempt: reconnectCount + 1
    });

    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
    clearInterval(pingIntervalRef.current);
    pingIntervalRef.current = null;
    clearTimeout(connectTimeoutRef.current);
    connectTimeoutRef.current = null;

    try {
      socketRef.current = new WebSocket(wsUrl);
      setIsConnected(false);
      setReady(false);
      
      socketRef.current.onopen = () => {
        console.log('WebSocketContext: Соединение установлено');
        
        setIsConnected(true);
        setConnectionError(null);
        setReconnectCount(0);
        setReady(true);
        
        pingIntervalRef.current = setInterval(sendPing, pingInterval);
        
        setTimeout(sendPing, 1000);
      };
      
      socketRef.current.onclose = (event) => {
        console.log('WebSocketContext: Соединение закрыто', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        socketRef.current = null;
        setIsConnected(false);
        setReady(false);
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;

        if (!event.wasClean && reconnectCount < maxReconnectAttempts && token && isAuthenticated) {
          const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
          console.log(`WebSocketContext: Планируем повторную попытку через ${delay}ms (${reconnectCount + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
          }, delay);
        } else if (reconnectCount >= maxReconnectAttempts) {
          setConnectionError('Превышено максимальное количество попыток переподключения');
        }
      };
      
      socketRef.current.onerror = (error) => {
        console.error('WebSocketContext: Ошибка WebSocket', error);
        setConnectionError('Ошибка соединения с сервером');
      };
      
      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setLastMessage({ data, timestamp: Date.now() });
          
          if (data.type === WS_TYPES.PONG) {
            console.log('WebSocketContext: Получен pong от сервера');
          }
          
          if (data.type === WS_TYPES.DEBUG) {
            console.log('WebSocketContext: Получено отладочное сообщение', data.payload);
          }
        } catch (error) {
          console.error('WebSocketContext: Ошибка при обработке сообщения', error);
        }
      };
    } catch (error) {
      console.error('WebSocketContext: Ошибка при создании WebSocket', error);
      setConnectionError('Ошибка инициализации WebSocket');
      socketRef.current = null;
    }
  }, [token, WS_URL, reconnectCount, getWebSocketUrl, sendPing, isAuthenticated]);
  
  useEffect(() => {
    if (isAuthenticated && token) {
      if (!socketRef.current) {
         console.log('WebSocketContext: Пользователь аутентифицирован и нет сокета, вызываем connect.');
         connect();
      } else {
         console.log('WebSocketContext: Пользователь аутентифицирован, но сокет уже существует/подключается, пропускаем connect.');
      }
    } else {
      if (socketRef.current) {
        console.log('WebSocketContext: Пользователь не аутентифицирован или нет токена, вызываем cleanup.');
        cleanup();
        setReconnectCount(0);
        setConnectionError(null);
      }
    }

    return () => {
        if (socketRef.current) {
             console.log('WebSocketContext: Размонтирование компонента, вызываем cleanup.');
             cleanup();
        }
    };
  }, [isAuthenticated, token, connect, cleanup]);
  
  const value = {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    lastMessage,
    ready,
    error: connectionError,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 