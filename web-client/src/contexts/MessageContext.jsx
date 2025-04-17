import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import * as api from '../api/messagesApi';
import { toast } from 'react-toastify';

// Создаем контекст с дефолтными значениями чтобы избежать null
const MessageContext = createContext({
  chats: [],
  activeChat: null,
  messages: [],
  loading: false,
  error: null,
  typingUsers: {},
  setActiveConversation: () => {},
  sendNewMessage: () => {},
  sendTypingStatus: () => {},
  loadChats: () => {},
  loadMoreMessages: () => {},
  createChat: () => {},
});

// Хук для использования контекста сообщений
export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    console.error('useMessage должен использоваться внутри MessageProvider');
  }
  return context;
};

// Экспортируем также во множественном числе для совместимости
export const useMessages = useMessage;

export const MessageProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const ws = useWebSocket();
  
  // Обезопасим доступ к свойствам из WebSocketContext
  const isConnected = ws?.isConnected || false;
  const sendMessage = ws?.sendMessage || (() => console.warn('sendMessage не доступен'));
  const lastMessage = ws?.lastMessage;
  const wsReady = ws?.ready || false;
  
  // Состояние для чатов и сообщений
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [lastChatsRequest, setLastChatsRequest] = useState(0);
  
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
      
      console.log(`MessageContext: Получено ${response?.data?.length || 0} сообщений для чата ${chatId}`);
      setMessages(response?.data || []);
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
    
    // Проверяем, прошло ли достаточно времени с последнего запроса (не менее 2 секунд)
    const now = Date.now();
    if (now - lastChatsRequest < 2000) {
      console.log('MessageContext: Запрос списка чатов был недавно, пропускаем');
      return;
    }
    
    console.log('MessageContext: Загрузка списка чатов');
    setLoading(true);
    setError(null);
    setLastChatsRequest(now); // Обновляем время последнего запроса
    
    try {
      const data = await api.getChats();
      
      if (!mountedRef.current) return;
      
      // Проверяем, что data не null и не undefined
      const chatsData = data || [];
      console.log(`MessageContext: Получено ${chatsData.length || 0} чатов`);
      setChats(chatsData);
      
      // Если есть чаты и нет активного, устанавливаем первый чат активным
      if (mountedRef.current && chatsData.length > 0 && !activeChat) {
        console.log(`MessageContext: Установка первого чата (${chatsData[0].id}) как активного`);
        setActiveChat(chatsData[0]);
        loadMessages(chatsData[0].id);
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
  }, [isAuthenticated, activeChat, loadMessages, lastChatsRequest]);
  
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
    
    // Ограничиваем частый вызов эффекта
    const timer = setTimeout(() => {
      if (isAuthenticated && mountedRef.current) {
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
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, wsReady, loadChats]);
  
  // Эффект для обработки сообщений через WebSocket
  useEffect(() => {
    // Проверяем, что у нас есть хотя бы основные компоненты сообщения
    if (!mountedRef.current || !lastMessage || !lastMessage.data) {
      return;
    }
    
    try {
      const { data } = lastMessage;
      
      // Проверяем тип сообщения
      if (!data || !data.type) {
        return;
      }
      
      console.log('MessageContext: Получено сообщение WebSocket:', data.type);
      
      // Обработка сообщений в зависимости от типа
      switch (data.type) {
        case 'message':
          if (data.payload) {
            handleMessageEvent(data.payload);
          }
          break;
        case 'typing':
          if (data.payload) {
            handleTypingEvent(data.payload);
          }
          break;
        default:
          console.log(`MessageContext: Неизвестный тип сообщения: ${data.type}`);
          break;
      }
    } catch (err) {
      console.error('MessageContext: Ошибка при обработке WebSocket сообщения:', err);
    }
  }, [lastMessage, handleMessageEvent, handleTypingEvent]);
  
  // Отправка статуса печатания
  const sendTypingStatus = useCallback((chatId, isTyping) => {
    if (!isConnected || !isAuthenticated || !chatId) {
      return false;
    }
    
    try {
      console.log(`MessageContext: Отправка статуса печатания ${isTyping ? 'начал печатать' : 'закончил печатать'} для чата ${chatId}`);
      
      const payload = {
        type: 'typing',
        payload: {
          chat_id: chatId,
          is_typing: isTyping
        }
      };
      
      sendMessage(payload);
      return true;
    } catch (err) {
      console.error('MessageContext: Ошибка при отправке статуса печатания:', err);
      return false;
    }
  }, [isConnected, isAuthenticated, sendMessage]);
  
  // Отправка сообщения
  const sendNewMessage = useCallback(async (chatId, content, attachments = []) => {
    if (!isAuthenticated || !chatId) {
      console.log(`MessageContext: Невозможно отправить сообщение. Аутентифицирован: ${isAuthenticated}, chatId: ${chatId}`);
      return false;
    }
    
    console.log(`MessageContext: Отправка сообщения в чат ${chatId}`);
    setLoading(true);
    
    try {
      const response = await api.sendMessage(chatId, content, attachments);
      
      if (!mountedRef.current) return false;
      
      console.log(`MessageContext: Сообщение успешно отправлено в чат ${chatId}`, response.data);
      
      // Обновляем список сообщений
      setMessages(prev => {
        if (response.data && !prev.some(m => m.id === response.data.id)) {
          return [...prev, response.data];
        }
        return prev;
      });
      
      // Обновляем список чатов с новым последним сообщением
      setChats(prev => {
        return prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              last_message: response.data
            };
          }
          return chat;
        });
      });
      
      return true;
    } catch (err) {
      console.error(`MessageContext: Ошибка отправки сообщения в чат ${chatId}:`, err);
      
      if (mountedRef.current) {
        setError('Не удалось отправить сообщение');
      }
      
      return false;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);
  
  // Загрузка дополнительных сообщений (постраничная загрузка)
  const loadMoreMessages = useCallback(async (chatId, offset) => {
    if (!mountedRef.current || !isAuthenticated || !chatId) {
      return false;
    }
    
    console.log(`MessageContext: Загрузка дополнительных сообщений для чата ${chatId}, смещение: ${offset}`);
    setLoading(true);
    
    try {
      const response = await api.getMessages(chatId, { offset });
      
      if (!mountedRef.current) return false;
      
      console.log(`MessageContext: Получено еще ${response?.data?.length || 0} сообщений для чата ${chatId}`);
      
      // Добавляем сообщения в начало списка
      setMessages(prev => {
        // Фильтруем дубликаты по id
        const newMessages = (response?.data || []).filter(
          newMsg => !prev.some(existingMsg => existingMsg.id === newMsg.id)
        );
        
        return [...newMessages, ...prev];
      });
      
      return true;
    } catch (err) {
      console.error(`MessageContext: Ошибка загрузки дополнительных сообщений для чата ${chatId}:`, err);
      
      if (mountedRef.current) {
        setError('Не удалось загрузить дополнительные сообщения');
      }
      
      return false;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);
  
  // Функция для создания нового чата
  const createChat = useCallback(async (chatData) => {
    if (!mountedRef.current || !isAuthenticated) {
      console.warn('MessageContext: Попытка создать чат без аутентификации или компонент размонтирован');
      return null;
    }
    
    console.log('MessageContext: Попытка создания чата с данными:', chatData);
    setLoading(true);
    setError(null);
    
    try {
      // Вызываем API для создания чата
      console.log('MessageContext: Вызов api.createChat... Объект api:', api);
      let newChat = null;
      try {
          console.log('MessageContext: Внутри вложенного try перед вызовом api.createChat');
          newChat = await api.createChat(chatData);
          console.log('MessageContext: Вызов api.createChat успешно завершен (или нет ошибки).');
      } catch (innerError) {
          console.error('MessageContext: Мгновенная ошибка при вызове api.createChat:', innerError);
          throw innerError; // Перебрасываем ошибку во внешний catch
      }
      
      if (!mountedRef.current) return null;

      if (newChat && newChat.id) {
        console.log('MessageContext: Чат успешно создан:', newChat);
        // Добавляем новый чат в начало списка
        setChats(prev => [newChat, ...prev]); 
        // Устанавливаем новый чат активным
        setActiveChat(newChat);
        // Загружаем сообщения для нового чата (он пока пустой)
        setMessages([]); 
        toast.success(`Чат ${newChat.name || 'успешно'} создан!`);
        return newChat;
      } else {
        console.error('MessageContext: API создания чата вернуло некорректный ответ', newChat);
        setError('Не удалось создать чат: некорректный ответ сервера.');
        toast.error('Не удалось создать чат.');
        return null;
      }
    } catch (err) {
      console.error('MessageContext: Ошибка при создании чата:', err);
      if (mountedRef.current) {
        const errorMessage = err.response?.data?.message || err.message || 'Неизвестная ошибка при создании чата.';
        setError(errorMessage);
        toast.error(`Ошибка создания чата: ${errorMessage}`);
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, setActiveChat]);

  const contextValue = {
    chats,
    activeChat,
    messages,
    loading,
    error,
    typingUsers,
    setActiveConversation,
    sendNewMessage,
    sendTypingStatus,
    loadChats,
    loadMoreMessages,
    createChat,
  };

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
};

export default MessageContext; 