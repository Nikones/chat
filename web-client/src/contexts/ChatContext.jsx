import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getChats, getMessages, sendMessageApi } from '../api/chat';
import { 
  encryptMessage, 
  decryptMessage, 
  generateChatKey, 
  encryptChatKey, 
  decryptChatKey 
} from '../utils/crypto';
import WebSocketService from '../api/websocket';

const ChatContext = createContext(null);

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wsService, setWsService] = useState(null);
  // Хранилище ключей шифрования для каждого чата
  const [chatKeys, setChatKeys] = useState({});

  // Инициализация WebSocket соединения
  useEffect(() => {
    if (isAuthenticated && !wsService) {
      const handleWsMessage = (message) => {
        console.log('Получено сообщение через WebSocket:', message);
        
        if (message.type === 'NEW_MESSAGE') {
          // Обработка нового сообщения
          handleNewMessage(message.data);
        } else if (message.type === 'KEY_EXCHANGE') {
          // Обработка обмена ключами
          handleKeyExchange(message.data);
        }
      };

      const handleWsClose = () => {
        console.log('WebSocket соединение закрыто');
      };

      const handleWsError = (error) => {
        console.error('WebSocket ошибка:', error);
      };

      // Создаем новый экземпляр WebSocket сервиса
      const ws = new WebSocketService(
        handleWsMessage,
        handleWsClose,
        handleWsError
      );
      
      ws.connect();
      setWsService(ws);

      // Закрываем соединение при размонтировании
      return () => {
        if (ws) {
          ws.disconnect();
        }
      };
    }
  }, [isAuthenticated]);

  // Загрузка списка чатов
  const loadChats = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const data = await getChats();
      setChats(data);
      
      // Если есть чаты и нет активного, устанавливаем первый чат активным
      if (data.length > 0 && !activeChat) {
        setActiveChat(data[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeChat]);

  // Загрузка сообщений чата
  const loadMessages = useCallback(async (chatId) => {
    if (!isAuthenticated || !chatId) return;
    
    setLoading(true);
    try {
      const data = await getMessages(chatId);
      
      // Получаем ключ для чата (или создаем новый)
      const chatKey = await getChatKey(chatId);
      
      // Расшифровываем сообщения
      const decryptedMessages = await Promise.all(
        data.map(async (message) => {
          if (message.encrypted && chatKey) {
            try {
              const decryptedText = await decryptMessage(message.text, chatKey);
              return { ...message, text: decryptedText, decrypted: true };
            } catch (error) {
              console.error('Ошибка расшифровки сообщения:', error);
              return { ...message, decryptError: true };
            }
          }
          return message;
        })
      );
      
      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Получение ключа для чата (из хранилища или создание нового)
  const getChatKey = async (chatId) => {
    // Если у нас уже есть ключ для этого чата
    if (chatKeys[chatId]) {
      return chatKeys[chatId];
    }
    
    // TODO: Загрузить ключ из IndexedDB или другого хранилища
    
    // Если ключа нет, создаем новый и обмениваемся им
    const newChatKey = await generateChatKey();
    
    // Сохраняем ключ в состоянии
    setChatKeys(prev => ({
      ...prev,
      [chatId]: newChatKey
    }));
    
    // TODO: Сохранить ключ в IndexedDB
    
    // TODO: Обменяться ключом с другими участниками чата
    
    return newChatKey;
  };

  // Обработка нового сообщения из WebSocket
  const handleNewMessage = async (messageData) => {
    // Проверяем, относится ли сообщение к текущему активному чату
    if (activeChat && messageData.chatId === activeChat.id) {
      // Получаем ключ для чата
      const chatKey = await getChatKey(messageData.chatId);
      
      // Расшифровываем сообщение, если оно зашифровано
      let processedMessage = messageData;
      if (messageData.encrypted && chatKey) {
        try {
          const decryptedText = await decryptMessage(messageData.text, chatKey);
          processedMessage = { ...messageData, text: decryptedText, decrypted: true };
        } catch (error) {
          console.error('Ошибка расшифровки сообщения:', error);
          processedMessage = { ...messageData, decryptError: true };
        }
      }
      
      // Добавляем сообщение в список
      setMessages(prev => [...prev, processedMessage]);
    }
    
    // Обновляем информацию о последнем сообщении в списке чатов
    setChats(prev => prev.map(chat => {
      if (chat.id === messageData.chatId) {
        return {
          ...chat,
          lastMessage: messageData.text, // Здесь можно показать "[Зашифрованное сообщение]" для зашифрованных
          lastMessageTime: messageData.timestamp,
          unreadCount: chat.unreadCount + (messageData.senderId !== user?.id ? 1 : 0)
        };
      }
      return chat;
    }));
  };

  // Обработка обмена ключами
  const handleKeyExchange = async (data) => {
    // TODO: Реализовать обмен ключами
    console.log('Получен запрос на обмен ключами:', data);
  };

  // Отправка сообщения
  const sendMessage = async (chatId, text) => {
    if (!isAuthenticated || !chatId || !text.trim()) return;
    
    try {
      // Получаем ключ для чата
      const chatKey = await getChatKey(chatId);
      
      // Шифруем сообщение
      const encryptedText = await encryptMessage(text, chatKey);
      
      // Создаем временное сообщение для отображения
      const tempId = 'temp-' + Date.now();
      const tempMessage = {
        id: tempId,
        chatId,
        senderId: user.id,
        text,
        timestamp: new Date().toISOString(),
        status: 'sending',
        decrypted: true // Уже расшифровано, так как мы его создали
      };
      
      // Добавляем в список сообщений
      setMessages(prev => [...prev, tempMessage]);
      
      // Отправляем зашифрованное сообщение
      const response = await sendMessageApi({
        chatId,
        text: encryptedText,
        encrypted: true
      });
      
      // Обновляем временное сообщение
      setMessages(prev => prev.map(msg => {
        if (msg.id === tempId) {
          return {
            ...msg,
            id: response.id,
            status: 'sent',
            timestamp: response.timestamp
          };
        }
        return msg;
      }));
      
      // Обновляем информацию о последнем сообщении в списке чатов
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            lastMessage: text,
            lastMessageTime: response.timestamp
          };
        }
        return chat;
      }));
      
      return response;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      
      // Помечаем сообщение как ошибочное
      setMessages(prev => prev.map(msg => {
        if (msg.id === 'temp-' + Date.now()) {
          return { ...msg, status: 'error' };
        }
        return msg;
      }));
      
      throw error;
    }
  };

  // Создание нового чата (с обменом ключами)
  const createChat = async (userId) => {
    // TODO: Реализовать создание чата с обменом ключами
  };

  const value = {
    chats,
    activeChat,
    setActiveChat,
    messages,
    loading,
    loadChats,
    loadMessages,
    sendMessage,
    createChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
