import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import wsService from '../utils/websocket';

// Создаем контекст для WebSocket
const WebSocketContext = createContext();

// Хук для использования контекста в компонентах
export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated, logout } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Обработчик сообщений от WebSocket
  const handleMessage = useCallback((data) => {
    console.log('WebSocketContext: получено сообщение', data);
    
    // Обрабатываем различные типы сообщений
    if (data.type === 'error') {
      toast.error(data.message || 'Произошла ошибка');
    }
  }, []);

  // Обработчик подключения
  const handleConnect = useCallback(() => {
    console.log('WebSocketContext: соединение установлено');
    setConnected(true);
    setLoading(false);
    setError(null);
  }, []);

  // Обработчик отключения
  const handleDisconnect = useCallback((event) => {
    console.log('WebSocketContext: соединение закрыто', event);
    setConnected(false);
    
    // Если код 1000, это чистое закрытие (например, при выходе пользователя)
    if (event.code !== 1000) {
      // Автоматически пытаемся переподключиться
      setLoading(true);
    }
  }, []);

  // Обработчик ошибок
  const handleError = useCallback((error) => {
    console.error('WebSocketContext: ошибка соединения', error);
    setError('Ошибка WebSocket соединения');
  }, []);

  // Обработчик превышения лимита попыток переподключения
  const handleReconnectFailed = useCallback(() => {
    setLoading(false);
    setError('Не удалось восстановить соединение. Попробуйте обновить страницу.');
    toast.error('Соединение с сервером потеряно. Попробуйте обновить страницу.', {
      autoClose: false,
    });
  }, []);

  // Инициализация сервиса при монтировании компонента
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('WebSocketContext: инициализация WebSocket с токеном');
      
      // Добавляем обработчики событий
      const handler = {
        onMessage: handleMessage,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onError: handleError,
        onReconnectFailed: handleReconnectFailed
      };
      
      wsService.addMessageHandler(handler);
      
      // Инициализируем соединение
      wsService.init(token);
      
      return () => {
        console.log('WebSocketContext: отключение WebSocket');
        wsService.removeMessageHandler(handler);
        wsService.disconnect();
      };
    } else {
      // Если пользователь не авторизован, отключаем WebSocket
      console.log('WebSocketContext: пользователь не авторизован, отключаем WebSocket');
      wsService.disconnect();
      setConnected(false);
      setLoading(false);
    }
  }, [
    token, 
    isAuthenticated, 
    handleMessage, 
    handleConnect, 
    handleDisconnect, 
    handleError, 
    handleReconnectFailed
  ]);

  // Отправка сообщения в чат
  const sendMessage = useCallback((chatId, messageContent, messageType = 'text') => {
    if (!connected) {
      toast.error('Нет соединения с сервером');
      return false;
    }
    
    if (!messageContent || messageContent.trim() === '') {
      console.warn('Попытка отправить пустое сообщение');
      return false;
    }
    
    try {
      // Создаем сообщение без шифрования
      const message = {
        type: 'message',
        content: {
          chatId,
          messageType,
          content: messageContent,
        }
      };
      
      // Отправляем сообщение
      return wsService.sendMessage(message);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      toast.error('Не удалось отправить сообщение');
      return false;
    }
  }, [connected]);

  // Отправка статуса печати
  const sendTypingStatus = useCallback((chatId, isTyping) => {
    if (!connected) return false;
    
    const message = {
      type: 'typing',
      content: {
        chatId,
        isTyping
      }
    };
    
    return wsService.sendMessage(message);
  }, [connected]);

  // Отправка статуса прочтения сообщения
  const markMessageAsRead = useCallback((messageId, chatId) => {
    if (!connected) return false;
    
    const message = {
      type: 'read',
      content: {
        messageId,
        chatId
      }
    };
    
    return wsService.sendMessage(message);
  }, [connected]);

  const contextValue = {
    connected,
    loading,
    error,
    sendMessage,
    sendTypingStatus,
    markMessageAsRead
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 