import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';

// Создаем контекст WebSocket
const WebSocketContext = createContext();

// Хук для использования WebSocket контекста
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket должен использоваться внутри WebSocketProvider');
  }
  return context;
};

// Провайдер WebSocket
export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [ready, setReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  // Функция для создания WebSocket URL с учетом текущего хоста
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Используем относительный путь для WebSocket
    return `${protocol}//${host}/api/ws${token ? `?token=${token}` : ''}`;
  }, [token]);

  // Функция для установки соединения WebSocket
  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated) {
      setReady(false);
      setIsConnected(false);
      return;
    }

    try {
      // Используем функцию для получения URL
      const wsUrl = getWebSocketUrl();
      console.log(`WebSocket: Подключение к ${wsUrl}`);
      
      // Закрываем существующее соединение, если оно есть
      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close();
      }
      
      // Создаем новое соединение
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Обработчики событий WebSocket
      socket.onopen = () => {
        console.log('WebSocket: Соединение установлено');
        setIsConnected(true);
        setReady(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        setReconnecting(false);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.error('WebSocket: Ошибка при разборе сообщения:', e);
        }
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket: Соединение закрыто (код: ${event.code})`);
        setIsConnected(false);
        
        // Пытаемся переподключиться, если соединение было неожиданно закрыто
        if (isAuthenticated && !event.wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setReconnecting(true);
          reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log(`WebSocket: Попытка переподключения ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
            connectWebSocket();
          }, RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Превышено количество попыток переподключения');
          setReconnecting(false);
          setReady(true); // Устанавливаем ready в true, чтобы не блокировать интерфейс
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket: Ошибка соединения', event);
        setError('Ошибка WebSocket соединения');
      };
      
    } catch (error) {
      console.error('WebSocket: Ошибка при создании соединения:', error);
      setError(`Ошибка при создании WebSocket: ${error.message}`);
      setReady(true); // Устанавливаем ready в true, чтобы не блокировать интерфейс
    }
  }, [isAuthenticated, token, getWebSocketUrl]);

  // Добавляем функцию переподключения
  const reconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError('Превышено максимальное количество попыток подключения');
      return;
    }

    setReconnecting(true);
    reconnectAttemptsRef.current += 1;

    // Создаем новое подключение
    const ws = new WebSocket(`wss://${window.location.host}/ws`);
    
    ws.onopen = () => {
      setIsConnected(true);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
      socketRef.current = ws;
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Планируем переподключение
      reconnectTimerRef.current = setTimeout(reconnect, 2000 * Math.pow(2, reconnectAttemptsRef.current));
    };

    ws.onerror = (error) => {
      setError(`Ошибка WebSocket: ${error.message}`);
    };
  }, []);

  // Инициализация WebSocket при монтировании
  useEffect(() => {
    if (isAuthenticated && token) {
      reconnect();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [isAuthenticated, token, reconnect]);

  // Подключаемся/отключаемся при изменении статуса аутентификации
  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      setReady(false);
    }
    
    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isAuthenticated, connectWebSocket]);

  // Функция для отправки сообщения через WebSocket
  const sendMessage = useCallback((data) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket: Попытка отправить сообщение при закрытом соединении');
      return false;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socketRef.current.send(message);
      return true;
    } catch (error) {
      console.error('WebSocket: Ошибка при отправке сообщения:', error);
      return false;
    }
  }, []);

  // Предоставляем данные и функции контекста
  const contextValue = {
    ready,
    isConnected,
    reconnecting,
    error,
    lastMessage,
    sendMessage: useCallback((message) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
      } else {
        setError('WebSocket не подключен');
      }
    }, [])
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;