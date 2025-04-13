import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import * as api from '../api/messagesApi';

// Создаем контекст для сообщений
const MessageContext = createContext(null);

// Хук для использования контекста сообщений
export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage должен использоваться внутри MessageProvider');
  }
  return context;
};

// Экспортируем также во множественном числе для совместимости
export const useMessages = useMessage;

export const MessageProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { isConnected, sendMessage, lastMessage, ready: wsReady } = useWebSocket();
  
  // Состояние для чатов и сообщений
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  
  // Реф для отслеживания монтирования компонента
  const mountedRef = useRef(true);
  
  // Устанавливаем mountedRef.current = false при размонтировании
  useEffect(() => {
    console.log('MessageContext: Инициализация контекста');
    mountedRef.current = true;
    return () => {
      console.log('MessageContext: Размонтирование контекста');
      mountedRef.current = false;
    };
  }, []);
  
  // Обработчик события нового сообщения
  const handleMessageEvent = useCallback((payload) => {
    if (!mountedRef.current || !payload || !payload.message || !payload.chat_id) {
      console.error('MessageContext: Некорректный формат сообщения или компонент размонтирован', payload);
      return;
    }
    
    const { message, chat_id } = payload;
    console.log(`MessageContext: Обработка нового сообщения для чата ${chat_id}`, message);
    
    // Добавляем сообщение в текущий список, избегая дубликатов
    setMessages(prev => {
      if (message.id && prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    
    // Обновляем список чатов
    setChats(prev => {
      return prev.map(chat => {
        if (chat.id === chat_id) {
          return {
            ...chat,
            last_message: message,
            unread_count: activeChat?.id === chat_id ? 0 : (chat.unread_count || 0) + 1
          };
        }
        return chat;
      });
    });
  }, [activeChat]);
  
  // Обработчик события набора текста
  const handleTypingEvent = useCallback((payload) => {
    if (!mountedRef.current || !payload || !payload.chat_id || typeof payload.user_id === 'undefined') {
      console.error('MessageContext: Некорректный формат события typing или компонент размонтирован', payload);
      return;
    }
    
    const { chat_id, user_id, is_typing } = payload;
    console.log(`MessageContext: Пользователь ${user_id} ${is_typing ? 'печатает' : 'прекратил печатать'} в чате ${chat_id}`);
    
    // Обновляем статус набора текста только для активного чата
    if (activeChat?.id === chat_id) {
      setTypingUsers(prev => ({
        ...prev,
        [user_id]: is_typing
      }));
      
      // Автоматически сбрасываем статус через 5 секунд
      if (is_typing) {
        setTimeout(() => {
          if (mountedRef.current) {
            setTypingUsers(prev => ({
              ...prev,
              [user_id]: false
            }));
          }
        }, 5000);
      }
    }
  }, [activeChat]);
  
  // Загрузка сообщений для конкретного чата
  const loadMessages = useCallback(async (chatId) => {
    if (!mountedRef.current || !isAuthenticated || !chatId) {
      console.log(`MessageContext: Пропуск загрузки сообщений. Аутентифицирован: ${isAuthenticated}, chatId: ${chatId}`);
      return;
    }
    
    console.log(`MessageContext: Загрузка сообщений для чата ${chatId}`);
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getMessages(chatId);
      
      if (!mountedRef.current) return;
      
      console.log(`MessageContext: Получено ${response.data?.length || 0} сообщений для чата ${chatId}`);
      setMessages(response.data || []);
    } catch (err) {
      console.error(`MessageContext: Ошибка загрузки сообщений для чата ${chatId}:`, err);
      
      if (mountedRef.current) {
        setError('Не удалось загрузить сообщения');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);
  
  // Загрузка списка чатов
  const loadChats = useCallback(async () => {
    if (!mountedRef.current || !isAuthenticated) {
      console.log('MessageContext: Пропуск загрузки чатов, пользователь не аутентифицирован или компонент размонтирован');
      return;
    }
    
    console.log('MessageContext: Загрузка списка чатов');
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getChats();
      
      if (!mountedRef.current) return;
      
      console.log(`MessageContext: Получено ${data?.length || 0} чатов`);
      setChats(data);
      
      // Если есть чаты и нет активного, устанавливаем первый чат активным
      if (mountedRef.current && data.length > 0 && !activeChat) {
        console.log(`MessageContext: Установка первого чата (${data[0].id}) как активного`);
        setActiveChat(data[0]);
        loadMessages(data[0].id);
      }
    } catch (err) {
      console.error('MessageContext: Ошибка загрузки чатов:', err);
      
      if (mountedRef.current) {
        setError('Не удалось загрузить чаты');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, activeChat, loadMessages]);
  
  // Установка активного чата
  const setActiveConversation = useCallback((chatId) => {
    if (!mountedRef.current) return;
    
    console.log(`MessageContext: Попытка установить активный чат ${chatId}`);
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      console.log(`MessageContext: Установка чата ${chatId} как активного`);
      setActiveChat(chat);
      loadMessages(chatId);
    } else {
      console.warn(`MessageContext: Чат с id ${chatId} не найден в списке чатов`);
    }
  }, [chats, loadMessages]);
  
  // Эффект для загрузки чатов при аутентификации и готовности WebSocket
  useEffect(() => {
    console.log(`MessageContext: Состояние для загрузки чатов - isAuthenticated: ${isAuthenticated}, wsReady: ${wsReady}`);
    
    if (isAuthenticated && wsReady && mountedRef.current) {
      console.log('MessageContext: Условия соблюдены, загружаем чаты');
      loadChats();
    } else if (!isAuthenticated) {
      // Сбрасываем состояние при выходе
      console.log('MessageContext: Сброс состояния при выходе из системы');
      setChats([]);
      setActiveChat(null);
      setMessages([]);
      setTypingUsers({});
    }
  }, [isAuthenticated, wsReady, loadChats]);
  
  // Эффект для обработки сообщений через WebSocket
  useEffect(() => {
    // Проверяем все необходимые условия
    if (!mountedRef.current || !wsReady || !isConnected || !lastMessage?.data) {
      const missingConditions = [];
      if (!mountedRef.current) missingConditions.push('компонент размонтирован');
      if (!wsReady) missingConditions.push('WebSocket не готов');
      if (!isConnected) missingConditions.push('WebSocket не подключен');
      if (!lastMessage?.data) missingConditions.push('нет данных сообщения');
      
      if (missingConditions.length > 0) {
        console.log(`MessageContext: Пропуск обработки WebSocket сообщения. Причина: ${missingConditions.join(', ')}`);
      }
      return;
    }
    
    try {
      const { data } = lastMessage;
      console.log('MessageContext: Получено сообщение WebSocket:', data.type);
      
      // Обработка сообщений в зависимости от типа
      switch (data.type) {
        case 'message':
          handleMessageEvent(data.payload);
          break;
        case 'typing':
          handleTypingEvent(data.payload);
          break;
        default:
          console.log(`MessageContext: Неизвестный тип сообщения: ${data.type}`);
          break;
      }
    } catch (err) {
      console.error('MessageContext: Ошибка при обработке WebSocket сообщения:', err);
    }
  }, [lastMessage, wsReady, isConnected, handleMessageEvent, handleTypingEvent]);
  
  // Отправка сообщения
  const sendNewMessage = useCallback(async (chatId, content, attachments = []) => {
    if (!isAuthenticated || !chatId) {
      console.warn(`MessageContext: Невозможно отправить сообщение. Аутентификация: ${isAuthenticated}, chatId: ${chatId}`);
      return null;
    }
    
    console.log(`MessageContext: Отправка сообщения в чат ${chatId}`);
    
    try {
      // Создаем временное сообщение для отображения
      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        chat_id: chatId,
        sender_id: user?.id,
        content,
        attachments,
        created_at: new Date().toISOString(),
        status: 'sending'
      };
      
      // Добавляем временное сообщение в список
      setMessages(prev => [...prev, tempMessage]);
      
      // Отправляем сообщение через API
      const response = await api.sendMessage(chatId, {
        content,
        attachments
      });
      
      if (!mountedRef.current) return null;
      
      // Обрабатываем ответ сервера
      const messageData = response.data;
      console.log(`MessageContext: Сообщение успешно отправлено, id: ${messageData.id}`);
      
      // Заменяем временное сообщение на реальное
      setMessages(prev => prev.map(m => 
        m.id === tempId ? messageData : m
      ));
      
      // Обновляем список чатов с новым последним сообщением
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? {
          ...chat,
          last_message: messageData
        } : chat
      ));
      
      // Отправляем уведомление через WebSocket, если соединение активно
      if (wsReady && isConnected) {
        try {
          console.log(`MessageContext: Отправка уведомления через WebSocket для сообщения ${messageData.id}`);
          sendMessage('message_notification', {
            chat_id: chatId,
            message_id: messageData.id
          });
        } catch (wsError) {
          console.error('MessageContext: Ошибка при отправке уведомления через WebSocket:', wsError);
          // Не прерываем выполнение основной функции
        }
      }
      
      return messageData;
    } catch (err) {
      console.error(`MessageContext: Ошибка отправки сообщения в чат ${chatId}:`, err);
      
      if (mountedRef.current) {
        // Обновляем статус временного сообщения на ошибку
        setMessages(prev => prev.map(m => 
          m.id === `temp-${Date.now()}` ? { ...m, status: 'error' } : m
        ));
        
        setError('Не удалось отправить сообщение');
      }
      
      return null;
    }
  }, [isAuthenticated, user, wsReady, isConnected, sendMessage]);
  
  // Отправка статуса набора текста
  const sendTypingStatus = useCallback((chatId, isTyping) => {
    if (!wsReady || !isConnected || !isAuthenticated || !chatId) {
      console.log(`MessageContext: Пропуск отправки статуса набора. WebSocket готов: ${wsReady}, подключен: ${isConnected}`);
      return;
    }
    
    try {
      console.log(`MessageContext: Отправка статуса набора текста для чата ${chatId}: ${isTyping ? 'печатает' : 'остановился'}`);
      sendMessage('typing', {
        chat_id: chatId,
        is_typing: isTyping
      });
    } catch (error) {
      console.error('MessageContext: Ошибка при отправке статуса набора текста:', error);
    }
  }, [isAuthenticated, wsReady, isConnected, sendMessage]);
  
  // Создание нового чата
  const createChat = useCallback(async (title, participants) => {
    if (!isAuthenticated) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.createChat({
        title,
        participants
      });
      
      if (!mountedRef.current) return null;
      
      const newChat = response.data;
      console.log('MessageContext: Создан новый чат:', newChat.id);
      
      // Добавляем новый чат в список
      setChats(prev => [newChat, ...prev]);
      
      // Устанавливаем новый чат как активный
      setActiveChat(newChat);
      
      return newChat;
    } catch (err) {
      console.error('MessageContext: Ошибка создания чата:', err);
      
      if (mountedRef.current) {
        setError('Не удалось создать чат');
      }
      
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);
  
  // Предоставляем контекст компонентам-потомкам
  const contextValue = {
    chats,
    activeChat,
    messages,
    loading,
    error,
    typingUsers,
    setActiveConversation,
    loadChats,
    loadMessages,
    sendNewMessage,
    sendTypingStatus,
    createChat
  };

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
};

export default MessageProvider; 