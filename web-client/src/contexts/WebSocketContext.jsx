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
  
  // WebSocket ссылка и таймеры
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const connectTimeoutRef = useRef(null);
  
  // Константы
  const maxReconnectAttempts = 5;
  const pingInterval = 30000; // 30 секунд
  const connectionTimeout = 10000; // 10 секунд
  
  // Функция для создания WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (!token) return null;
    return `${WS_URL}?token=${encodeURIComponent(token)}`;
  }, [token]);
  
  // Функция для очистки таймеров и ссылок
  const cleanup = useCallback(() => {
    console.log('WebSocketContext: Очистка ресурсов');
    
    // Очищаем все таймеры
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
    
    // Закрываем соединение
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        console.error('WebSocketContext: Ошибка при закрытии соединения', e);
      }
      socketRef.current = null;
    }
    
    // Сбрасываем состояния
    setIsConnected(false);
    setReady(false);
  }, []);
  
  // Функция для отправки сообщений
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
  
  // Функция для отправки ping
  const sendPing = useCallback(() => {
    if (isConnected && socketRef.current) {
      sendMessage(WS_TYPES.PING, { timestamp: Date.now() });
    }
  }, [isConnected, sendMessage]);
  
  // Функция для установки соединения
  const connect = useCallback(() => {
    // Очищаем предыдущие ресурсы
    cleanup();
    
    if (!token || !isAuthenticated) {
      console.log('WebSocketContext: Нет токена или пользователь не аутентифицирован - пропускаем подключение');
      return;
    }
    
    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      console.error('WebSocketContext: Не удалось сформировать URL для WebSocket');
      return;
    }
    
    console.log('WebSocketContext: Попытка подключения к WebSocket', {
      url: WS_URL,
      tokenLength: token?.length || 0,
      attempt: reconnectCount + 1
    });
    
    try {
      // Создаем новое соединение
      socketRef.current = new WebSocket(wsUrl);
      
      // Устанавливаем таймаут на подключение
      connectTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
          console.error('WebSocketContext: Таймаут подключения');
          
          try {
            socketRef.current.close();
          } catch (e) {
            console.error('WebSocketContext: Ошибка при закрытии соединения после таймаута', e);
          }
          
          socketRef.current = null;
          setIsConnected(false);
          
          // Пробуем переподключиться
          if (reconnectCount < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
            console.log(`WebSocketContext: Повторная попытка подключения через ${delay}ms (${reconnectCount + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectCount(prev => prev + 1);
              connect();
            }, delay);
          } else {
            setConnectionError('Не удалось подключиться к серверу после нескольких попыток');
          }
        }
      }, connectionTimeout);
      
      // Обработчик открытия соединения
      socketRef.current.onopen = () => {
        console.log('WebSocketContext: Соединение установлено');
        
        // Очищаем таймаут подключения
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        
        setIsConnected(true);
        setConnectionError(null);
        setReconnectCount(0);
        setReady(true);
        
        // Устанавливаем ping интервал
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        pingIntervalRef.current = setInterval(sendPing, pingInterval);
        
        // Отправляем первый ping для проверки соединения
        setTimeout(sendPing, 1000);
      };
      
      // Обработчик закрытия соединения
      socketRef.current.onclose = (event) => {
        console.log('WebSocketContext: Соединение закрыто', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        setIsConnected(false);
        setReady(false);
        
        // Очищаем таймеры
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        
        // Если не чистое закрытие, пробуем переподключиться
        if (!event.wasClean && reconnectCount < maxReconnectAttempts && token && isAuthenticated) {
          const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
          console.log(`WebSocketContext: Повторная попытка подключения через ${delay}ms (${reconnectCount + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, delay);
        } else if (reconnectCount >= maxReconnectAttempts) {
          setConnectionError('Превышено максимальное количество попыток переподключения');
        }
      };
      
      // Обработчик ошибок
      socketRef.current.onerror = (error) => {
        console.error('WebSocketContext: Ошибка WebSocket', error);
        setConnectionError('Ошибка соединения с сервером');
      };
      
      // Обработчик сообщений
      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Обновляем последнее полученное сообщение
          setLastMessage({ data, timestamp: Date.now() });
          
          // Обрабатываем pong
          if (data.type === WS_TYPES.PONG) {
            console.log('WebSocketContext: Получен pong от сервера');
          }
          
          // Отладочные сообщения
          if (data.type === WS_TYPES.DEBUG) {
            console.log('WebSocketContext: Получено отладочное сообщение', data.payload);
          }
        } catch (error) {
          console.error('WebSocketContext: Ошибка при обработке сообщения', error);
        }
      };
    } catch (error) {
      console.error('WebSocketContext: Ошибка при инициализации WebSocket', error);
      setConnectionError(`Ошибка при инициализации соединения: ${error.message}`);
      
      // Пробуем переподключиться
      if (reconnectCount < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
        console.log(`WebSocketContext: Повторная попытка подключения через ${delay}ms (${reconnectCount + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectCount(prev => prev + 1);
          connect();
        }, delay);
      }
    }
  }, [token, isAuthenticated, reconnectCount, getWebSocketUrl, cleanup, sendPing]);
  
  // Эффект для установки соединения при изменении состояния аутентификации
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('WebSocketContext: Пользователь аутентифицирован, устанавливаем соединение');
      connect();
    } else {
      console.log('WebSocketContext: Пользователь не аутентифицирован, закрываем соединение');
      cleanup();
    }
    
    return cleanup;
  }, [isAuthenticated, token, connect, cleanup]);
  
  // Контекст для предоставления компонентам
  const contextValue = {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    lastMessage,
    ready,
    error: connectionError
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 