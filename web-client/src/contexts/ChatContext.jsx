import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import websocketService from '../utils/websocket';
import encryptionService from '../utils/encryption';
import messagesApi from '../api/messages';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { currentUser, token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [callState, setCallState] = useState({
    inCall: false,
    incomingCall: null,
    outgoingCall: null,
    currentCall: null
  });

  // Обработчик новых сообщений
  const handleNewMessage = useCallback(async (message) => {
    if (message.type === 'text') {
      // Расшифровываем сообщение
      let decryptedContent;
      try {
        decryptedContent = await encryptionService.decryptMessage(
          message.content,
          message.sender_id.toString()
        );
      } catch (error) {
        console.error('Ошибка расшифровки сообщения:', error);
        decryptedContent = 'Ошибка расшифровки сообщения';
      }

      // Обновляем сообщения
      setMessages(prevMessages => {
        const conversationId = message.sender_id.toString();
        const conversationMessages = prevMessages[conversationId] || [];
        
        return {
          ...prevMessages,
          [conversationId]: [
            ...conversationMessages,
            {
              ...message,
              content: decryptedContent
            }
          ]
        };
      });

      // Обновляем список разговоров
      setConversations(prevConversations => {
        const conversationIndex = prevConversations.findIndex(
          c => c.id === message.sender_id.toString()
        );

        if (conversationIndex >= 0) {
          // Обновляем существующий разговор
          const updatedConversations = [...prevConversations];
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            lastMessage: decryptedContent,
            lastMessageTime: new Date().toISOString()
          };
          return updatedConversations;
        } else {
          // Создаем новый разговор
          return [
            ...prevConversations,
            {
              id: message.sender_id.toString(),
              name: `Пользователь ${message.sender_id}`,
              lastMessage: decryptedContent,
              lastMessageTime: new Date().toISOString()
            }
          ];
        }
      });
    } else if (message.type === 'call_offer') {
      // Обработка входящего звонка
      setCallState(prev => ({
        ...prev,
        incomingCall: {
          from: message.sender_id,
          sdp: message.content.sdp
        }
      }));
    } else if (message.type === 'call_answer') {
      // Обработка ответа на звонок
      setCallState(prev => ({
        ...prev,
        outgoingCall: null,
        currentCall: {
          ...prev.currentCall,
          connected: true,
          remoteDescription: message.content.sdp
        }
      }));
    } else if (message.type === 'ice_candidate') {
      // Обработка ICE-кандидатов
      if (callState.currentCall) {
        // Обработка в компоненте звонка
      }
    }
  }, [callState]);

  // Соединение с WebSocket
  useEffect(() => {
    if (isAuthenticated && token) {
      // Инициализация WebSocket
      websocketService.init(token, handleNewMessage);
      
      // Обработчики соединения
      const handleConnect = () => {
        setConnected(true);
      };
      
      const handleDisconnect = () => {
        setConnected(false);
      };
      
      // Регистрация обработчиков
      websocketService.onConnect(handleConnect);
      websocketService.onDisconnect(handleDisconnect);
      
      // Установка соединения
      websocketService.connect();
      
      return () => {
        websocketService.disconnect();
      };
    }
  }, [isAuthenticated, token, handleNewMessage]);

  // Загрузка разговоров при подключении
  useEffect(() => {
    if (connected && currentUser) {
      // Загрузка данных происходит через WebSocket
      // Можно добавить специальное сообщение для запроса существующих разговоров
    }
  }, [connected, currentUser]);

  // Отправка сообщения
  const sendMessage = async (recipientId, content) => {
    try {
      // Шифруем сообщение перед отправкой (только для WebSocket)
      const encryptedContent = await encryptionService.encryptMessage(
        content,
        recipientId.toString()
      );
      
      // Пробуем отправить через HTTP API
      const result = await messagesApi.sendMessage(
        parseInt(recipientId),
        content, // Не шифруем для HTTP - сервер сохранит как есть
        token
      );
      
      // Если успешно, добавляем сообщение в локальное состояние
      if (result) {
        setMessages(prevMessages => {
          const conversationId = recipientId.toString();
          const conversationMessages = prevMessages[conversationId] || [];
          
          return {
            ...prevMessages,
            [conversationId]: [
              ...conversationMessages,
              {
                id: result.id || Math.random().toString(36).substr(2, 9),
                sender_id: currentUser.id,
                recipient_id: parseInt(recipientId),
                content: content,
                is_read: false,
                created_at: result.created_at || new Date().toISOString()
              }
            ]
          };
        });
        
        // Обновляем список разговоров
        setConversations(prevConversations => {
          const conversationIndex = prevConversations.findIndex(
            c => c.id === recipientId.toString()
          );
          
          if (conversationIndex >= 0) {
            // Обновляем существующий разговор
            const updatedConversations = [...prevConversations];
            updatedConversations[conversationIndex] = {
              ...updatedConversations[conversationIndex],
              lastMessage: content,
              lastMessageTime: new Date().toISOString()
            };
            return updatedConversations;
          } else {
            // Создаем новый разговор
            return [
              ...prevConversations,
              {
                id: recipientId.toString(),
                name: `Пользователь ${recipientId}`,
                lastMessage: content,
                lastMessageTime: new Date().toISOString()
              }
            ];
          }
        });
        
        // Если HTTP запрос успешен, но соединение WebSocket тоже есть,
        // дублируем отправку через WebSocket для real-time обновления
        if (connected) {
          websocketService.sendMessage({
            type: 'text',
            content: {
              recipient_id: parseInt(recipientId),
              content: encryptedContent
            }
          });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return false;
    }
  };

  // Инициирование звонка
  const initiateCall = async (recipientId) => {
    // Реализация инициирования звонка
  };

  // Ответ на звонок
  const answerCall = async () => {
    // Реализация ответа на звонок
  };

  // Завершение звонка
  const endCall = () => {
    // Реализация завершения звонка
  };

  const value = {
    connected,
    conversations,
    activeConversation,
    messages,
    callState,
    setActiveConversation,
    sendMessage,
    initiateCall,
    answerCall,
    endCall
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
