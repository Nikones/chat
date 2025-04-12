import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

// Создаем контекст с начальными значениями
const WebSocketContext = createContext({
  socket: null,
  isConnected: false,
  sendMessage: () => false,
  setMessageHandler: () => {},
  ready: false,
  error: null
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket должен использоваться внутри WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  // Создание и настройка WebSocket соединения
  const connect = useCallback(() => {
    // Если нет авторизации или токена, не подключаемся
    if (!isAuthenticated || !token) {
      setReady(false);
      return;
    }

    // Закрываем предыдущее соединение, если оно существует
    if (socket) {
      socket.close();
    }

    try {
      // Создаем WebSocket соединение с токеном в URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${token}`;
      
      console.log('WebSocketContext: Подключение к', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocketContext: Соединение установлено');
        setIsConnected(true);
        setReconnectAttempt(0);
        setError(null);
        setReady(true);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocketContext: Соединение закрыто:', event);
        setIsConnected(false);
        
        // Попытка переподключения только если это не намеренное закрытие
        if (!event.wasClean && isAuthenticated && token) {
          setTimeout(() => {
            if (reconnectAttempt < maxReconnectAttempts) {
              setReconnectAttempt(prev => prev + 1);
              connect();
            } else {
              setError('Превышено максимальное количество попыток подключения');
              setReady(true); // Считаем готовым, хотя и с ошибкой
              toast.error('Не удалось подключиться к серверу. Попробуйте обновить страницу.');
            }
          }, reconnectDelay);
        } else {
          setReady(true); // Считаем, что контекст готов, даже если соединение закрыто
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocketContext: Ошибка соединения:', error);
        setError('Ошибка WebSocket соединения');
        ws.close();
      };
      
      setSocket(ws);
    } catch (error) {
      console.error('WebSocketContext: Ошибка при создании соединения', error);
      setError(`Ошибка при создании соединения: ${error.message}`);
      setReady(true); // Считаем готовым, но с ошибкой
    }
  }, [token, isAuthenticated, socket, reconnectAttempt, maxReconnectAttempts, reconnectDelay]);

  // Переподключение при изменении токена или аутентификации
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      // Если пользователь не аутентифицирован, но есть соединение, закрываем его
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
      
      // Контекст готов даже если соединение не установлено
      setReady(true);
    }
    
    // Очистка при размонтировании компонента
    return () => {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    };
  }, [token, isAuthenticated, connect, socket]);

  // Функция для отправки сообщений
  const sendMessage = useCallback((type, payload) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketContext: WebSocket не подключен');
      return false;
    }
    
    try {
      const message = {
        type,
        payload
      };
      
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('WebSocketContext: Ошибка при отправке сообщения:', error);
      return false;
    }
  }, [socket]);

  // Функция установки обработчика сообщений
  const setMessageHandler = useCallback((callback) => {
    if (!socket) return;
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('WebSocketContext: Ошибка при обработке сообщения:', error);
      }
    };
  }, [socket]);

  // Значение контекста
  const value = {
    socket,
    isConnected,
    sendMessage,
    setMessageHandler,
    ready,
    error
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 