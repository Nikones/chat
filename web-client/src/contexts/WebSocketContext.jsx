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
};

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
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0); // Счетчик попыток переподключения
  const [debugInfo, setDebugInfo] = useState({}); // Информация для отладки
  
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const maxReconnectAttempts = 5; // Максимальное количество попыток переподключения
  
  // Состояние для отладочной информации
  const [debug, setDebugState] = useState({
    logs: [],  // массив логов для отслеживания событий
    lastError: null, // последняя ошибка
    connectionStats: {
      connectCount: 0,
      disconnectCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastConnectTime: null,
      lastDisconnectTime: null
    }
  });
  
  // Функция для логирования отладочной информации
  const logDebug = useCallback((message, data = {}) => {
    const logEntry = {
      timestamp: new Date(),
      message,
      data,
    };
    
    console.debug(`[WebSocket] ${message}`, data);
    
    setDebugState(prev => {
      // Ограничиваем количество записей до 50
      const logs = [logEntry, ...prev.logs].slice(0, 50);
      return { ...prev, logs };
    });
  }, []);
  
  // Функция для обновления статистики соединений
  const updateConnectionStats = useCallback((type, data = {}) => {
    setDebugState(prev => {
      const stats = { ...prev.connectionStats };
      
      switch (type) {
        case 'connect':
          stats.connectCount += 1;
          stats.lastConnectTime = new Date();
          break;
        case 'disconnect':
          stats.disconnectCount += 1;
          stats.lastDisconnectTime = new Date();
          break;
        case 'send':
          stats.messagesSent += 1;
          break;
        case 'receive':
          stats.messagesReceived += 1;
          break;
        default:
          break;
      }
      
      return { ...prev, connectionStats: stats };
    });
  }, []);

  // Функция для установки соединения
  const connect = useCallback(() => {
    try {
      if (!token) {
        logDebug('Попытка соединения без токена!');
        return;
      }
      
      if (!user) {
        logDebug('Попытка соединения без пользователя!');
        return;
      }

      // Очищаем старое соединение при повторном подключении
      if (ws.current) {
        logDebug('Закрываем предыдущее соединение перед повторным подключением');
        ws.current.close();
      }

      const baseUrl = window.location.origin.replace('http', 'ws');
      const wsUrl = `${baseUrl}/api/ws?token=${encodeURIComponent(token)}`;
      
      // Логируем токен для отладки (только часть токена для безопасности)
      logDebug('Инициализация WebSocket соединения', { 
        userId: user.id,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + '...',
        wsUrl: wsUrl.replace(token, '[HIDDEN]')
      });
      
      // Инициализация WebSocket соединения
      ws.current = new WebSocket(wsUrl);
      
      // Добавляем обработчики событий
      ws.current.onopen = () => {
        logDebug('WebSocket соединение установлено', { userId: user.id });
        setIsConnected(true);
        setConnectionError(null);
        setReconnectCount(0); // Сбрасываем счетчик переподключений при успешном соединении
        updateConnectionStats('connect');
        
        // Отправляем тестовое сообщение для проверки соединения
        setTimeout(() => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const testMsg = {
              type: 'ping',
              payload: { clientTime: new Date().toISOString() }
            };
            try {
              ws.current.send(JSON.stringify(testMsg));
              logDebug('Отправлено тестовое сообщение', testMsg);
            } catch (err) {
              logDebug('Ошибка при отправке тестового сообщения', { error: err.toString() });
            }
          }
        }, 1000);
      };

      ws.current.onclose = (event) => {
        logDebug('WebSocket соединение закрыто', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          reconnectCount
        });
        
        setIsConnected(false);
        updateConnectionStats('disconnect');
        
        // Если не чистое закрытие и не превышено количество попыток переподключения, пробуем снова
        if (reconnectCount < maxReconnectAttempts && token && user) {
          const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000); // Экспоненциальная задержка, макс. 30 секунд
          logDebug(`Повторное подключение через ${delay}ms, попытка ${reconnectCount + 1}/${maxReconnectAttempts}`);
          
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
          }, delay);
        } else if (reconnectCount >= maxReconnectAttempts) {
          logDebug('Превышено максимальное количество попыток переподключения');
          setConnectionError('Превышено максимальное количество попыток переподключения. Попробуйте перезагрузить страницу.');
        }
      };

      ws.current.onerror = (error) => {
        logDebug('Ошибка WebSocket соединения', { error: error.toString() });
        setConnectionError('Ошибка соединения с сервером. Пожалуйста, проверьте подключение к интернету.');
      };

      ws.current.onmessage = (event) => {
        updateConnectionStats('receive');
        
        try {
          const message = JSON.parse(event.data);
          logDebug('Получено сообщение WebSocket', { type: message.type });
          
          // Обрабатываем полученное сообщение в зависимости от типа
          if (message.type === WS_TYPES.DEBUG) {
            logDebug('Получено отладочное сообщение от сервера', message.payload);
            // Обновляем информацию об отладке
            setDebugInfo(prev => ({
              ...prev,
              serverInfo: message.payload
            }));
          }
          
          // Обработка других типов сообщений
          // ...
        } catch (error) {
          logDebug('Ошибка при обработке сообщения WebSocket', { 
            error: error.toString(), 
            data: event.data 
          });
        }
      };
    } catch (error) {
      logDebug('Ошибка при инициализации WebSocket', { error: error.toString() });
      setConnectionError('Ошибка при инициализации WebSocket соединения: ' + error.message);
    }
  }, [token, user, reconnectCount, logDebug, updateConnectionStats]);

  // Эффект для подключения при загрузке и при изменении токена или пользователя
  useEffect(() => {
    if (token && user) {
      logDebug('Запуск подключения WebSocket', { userId: user.id });
      connect();
    } else {
      logDebug('WebSocket не подключается: нет токена или пользователя');
    }

    // Очистка при размонтировании
    return () => {
      logDebug('Компонент размонтирован, закрываем соединение');
      clearTimeout(reconnectTimeout.current);
      
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [token, user, connect, logDebug]);

  // Эффект для переподключения при изменении счетчика
  useEffect(() => {
    if (reconnectCount > 0 && token && user) {
      logDebug(`Попытка переподключения #${reconnectCount}`);
      connect();
    }
  }, [reconnectCount, connect, token, user, logDebug]);

  // Функция для отправки сообщения через WebSocket
  const sendMessage = useCallback((type, payload) => {
    if (!isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      logDebug('Попытка отправки сообщения без активного соединения', { type, payload });
      return false;
    }

    try {
      const message = JSON.stringify({ type, payload });
      ws.current.send(message);
      updateConnectionStats('send');
      logDebug('Сообщение отправлено', { type, payloadSize: JSON.stringify(payload).length });
      return true;
    } catch (error) {
      logDebug('Ошибка при отправке сообщения', { 
        type, 
        error: error.toString(),
        connectionState: ws.current ? ws.current.readyState : 'null'
      });
      return false;
    }
  }, [isConnected, logDebug, updateConnectionStats]);

  // Функция для ручного переподключения
  const reconnect = useCallback(() => {
    logDebug('Запрос на ручное переподключение');
    setReconnectCount(0); // Сбрасываем счетчик
    connect();
  }, [connect, logDebug]);

  // Предоставляем контекст для потребителей
  const contextValue = {
    isConnected,
    connectionError,
    reconnectCount,
    debugInfo,
    sendMessage,
    reconnect,
    wsTypes: WS_TYPES,
    debug: debug,
    logDebug
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 