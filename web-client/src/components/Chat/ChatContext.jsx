import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { v4 as uuidv4 } from 'uuid';

import { AuthContext } from '../Auth/AuthContext';
import { ApiInstance } from '../../api/apiInstance';
import { encryptMessage, decryptMessage, initSignalProtocol, generateKeyPair } from '../../utils/encryption';
import { FilesAPI } from '../../api/files';

// Создаем контекст
export const ChatContext = createContext();

// Провайдер контекста
export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [signalProtocol, setSignalProtocol] = useState(null);
  const [deviceId] = useState(uuidv4());

  const { currentUser, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const filesApi = new FilesAPI();

  // Загрузка пользователей
  const { data: usersData, error: usersError } = useSWR(
    isAuthenticated ? '/api/chat/users' : null,
    ApiInstance.fetcher,
    { refreshInterval: 30000 }
  );

  useEffect(() => {
    if (usersData) {
      setUsers(usersData);
    }
  }, [usersData]);

  // Инициализация Signal Protocol
  useEffect(() => {
    const initializeSignalProtocol = async () => {
      if (isAuthenticated && currentUser && !isInitialized) {
        try {
          // Генерируем или загружаем идентификатор устройства
          console.log('Инициализация Signal Protocol для устройства:', deviceId);
          
          // Инициализируем протокол
          const keyPair = await generateKeyPair();
          const protocol = await initSignalProtocol(currentUser.id, deviceId, keyPair);
          
          setSignalProtocol(protocol);
          setIsInitialized(true);
          console.log('Signal Protocol инициализирован успешно');
        } catch (error) {
          console.error('Ошибка инициализации Signal Protocol:', error);
        }
      }
    };

    initializeSignalProtocol();
  }, [currentUser, isAuthenticated, deviceId, isInitialized]);

  // Подключение к WebSocket серверу для чата
  useEffect(() => {
    if (isAuthenticated && currentUser && signalProtocol) {
      // Получаем JWT токен из localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('ChatContext: Токен отсутствует в localStorage');
        logout();
        navigate('/login');
        return;
      }

      console.log('ChatContext: Получен токен из localStorage, первые 10 символов:', token.substring(0, 10) + '...');

      // URL для WebSocket подключения
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${token}`;

      console.log('ChatContext: Попытка подключения к WebSocket:', wsUrl.split('?')[0], 'с токеном в URL');
      
      console.log('ChatContext: Устанавливаем таймер на 1 секунду перед подключением для отладки');
      setTimeout(() => {
        console.log('ChatContext: Создаем WebSocket соединение после задержки');
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('ChatContext: WebSocket соединение установлено успешно');
          // После установки соединения нет необходимости отправлять токен,
          // т.к. он уже передан в URL
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Получено WebSocket сообщение:', data.type);

            switch (data.type) {
              case 'text':
                // Обрабатываем текстовое сообщение
                const content = data.content;
                
                // Если сообщение зашифровано, расшифровываем его
                if (content && content.content) {
                  try {
                    // Расшифровываем сообщение
                    const decryptedContent = await decryptMessage(
                      signalProtocol,
                      content.sender_id,
                      content.content
                    );
                    
                    content.content = decryptedContent;
                  } catch (decryptError) {
                    console.error('Ошибка расшифровки сообщения:', decryptError);
                    // В случае ошибки расшифровки используем оригинальный контент
                    content.content = content.content + ' [Ошибка расшифровки]';
                  }
                }

                // Обновляем состояние сообщений
                setMessages(prevMessages => {
                  const userId = content.sender_id !== currentUser.id 
                    ? content.sender_id 
                    : content.recipient_id;
                  
                  const userMessages = prevMessages[userId] || [];
                  
                  // Проверяем, нет ли уже такого сообщения
                  const messageExists = userMessages.some(msg => msg.id === content.id);
                  
                  if (messageExists) {
                    return prevMessages;
                  }
                  
                  // Добавляем новое сообщение
                  const newUserMessages = [...userMessages, content].sort(
                    (a, b) => new Date(a.created_at) - new Date(b.created_at)
                  );
                  
                  return {
                    ...prevMessages,
                    [userId]: newUserMessages
                  };
                });

                // Обновляем счетчик непрочитанных сообщений
                if (content.sender_id !== currentUser.id && 
                    (!selectedUser || selectedUser.id !== content.sender_id)) {
                  setUnreadCounts(prev => ({
                    ...prev,
                    [content.sender_id]: (prev[content.sender_id] || 0) + 1
                  }));
                }
                break;

              case 'read_receipt':
                // Обрабатываем уведомление о прочтении сообщений
                const readReceipt = data.content;
                
                if (readReceipt && readReceipt.reader_id) {
                  // Отмечаем сообщения как прочитанные
                  setMessages(prevMessages => {
                    const userMessages = prevMessages[readReceipt.reader_id] || [];
                    
                    // Помечаем все сообщения как прочитанные
                    const updatedMessages = userMessages.map(msg => ({
                      ...msg,
                      is_read: true
                    }));
                    
                    return {
                      ...prevMessages,
                      [readReceipt.reader_id]: updatedMessages
                    };
                  });
                }
                break;

              case 'call_offer':
                // Обработка предложения звонка
                console.log('Получено предложение звонка:', data.content);
                // Здесь будет логика обработки звонков
                break;
                
              case 'call_answer':
                // Обработка ответа на звонок
                console.log('Получен ответ на звонок:', data.content);
                // Здесь будет логика обработки ответа на звонок
                break;
                
              case 'ice_candidate':
                // Обработка ICE кандидата
                console.log('Получен ICE кандидат:', data.content);
                // Здесь будет логика обработки ICE кандидатов
                break;

              default:
                console.log('Неизвестный тип сообщения:', data.type);
            }
          } catch (error) {
            console.error('Ошибка обработки WebSocket сообщения:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('ChatContext: Ошибка WebSocket соединения. Объект события:', error);
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          console.log('ChatContext: WebSocket соединение закрыто. Детали:', { 
            code: event.code, 
            reason: event.reason, 
            wasClean: event.wasClean 
          });
          setIsConnected(false);
          
          // Повторное подключение через 5 секунд
          setTimeout(() => {
            console.log('Попытка переподключения...');
            setSocket(null);
          }, 5000);
        };

        setSocket(ws);
        setIsConnected(true);

        // Закрытие соединения при размонтировании компонента
        return () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      }, 1000);
      
      // Добавляем прямое тестовое подключение для диагностики
      console.log('ChatContext: Добавляем тестовое подключение напрямую для диагностики');
      const testWs = new WebSocket(wsUrl, protocols);
      testWs.onopen = () => console.log('ТЕСТ ChatContext: WebSocket соединение открыто успешно');
      testWs.onerror = (e) => console.error('ТЕСТ ChatContext: Ошибка WebSocket соединения', e);
      testWs.onclose = (e) => console.log('ТЕСТ ChatContext: WebSocket соединение закрыто', e.code, e.reason);
    }
  }, [currentUser, isAuthenticated, logout, navigate, signalProtocol]);

  // Загрузка сообщений для выбранного пользователя
  const loadMessages = useCallback(async (userId) => {
    if (!isAuthenticated || !userId) return;

    try {
      const response = await ApiInstance.get(`/api/messages/${userId}`);
      const fetchedMessages = response.data.messages || [];

      // Расшифровываем сообщения
      const decryptedMessages = await Promise.all(
        fetchedMessages.map(async (msg) => {
          if (!signalProtocol) return msg;
          
          try {
            // Расшифровываем только сообщения от других пользователей
            if (msg.sender_id !== currentUser.id) {
              const decryptedContent = await decryptMessage(
                signalProtocol,
                msg.sender_id,
                msg.content
              );
              return { ...msg, content: decryptedContent };
            }
            return msg;
          } catch (error) {
            console.error('Ошибка расшифровки сообщения:', error);
            return { ...msg, content: msg.content + ' [Ошибка расшифровки]' };
          }
        })
      );

      setMessages(prev => ({
        ...prev,
        [userId]: decryptedMessages
      }));

      // Сбрасываем счетчик непрочитанных сообщений
      setUnreadCounts(prev => ({
        ...prev,
        [userId]: 0
      }));

      // Отправляем запрос на отметку сообщений как прочитанных
      await ApiInstance.post('/api/messages/read', { sender_id: userId });

    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  }, [isAuthenticated, currentUser, signalProtocol]);

  // Отправка сообщения
  const sendMessage = useCallback(async (recipientId, content, fileId = null) => {
    if (!isAuthenticated || !socket || !content || !signalProtocol) return;

    try {
      // Шифруем сообщение
      const encryptedContent = await encryptMessage(
        signalProtocol,
        recipientId,
        content
      );

      // Если сообщение отправляется через WebSocket
      if (socket.readyState === WebSocket.OPEN) {
        // Создаем объект сообщения для отправки
        const message = {
          type: 'text',
          content: {
            recipient_id: recipientId,
            content: encryptedContent,
            file_id: fileId
          }
        };

        // Отправляем сообщение через WebSocket
        socket.send(JSON.stringify(message));
      } else {
        // Если WebSocket не доступен, отправляем через REST API
        await ApiInstance.post('/api/messages', {
          recipient_id: recipientId,
          content: encryptedContent,
          file_id: fileId
        });
      }

      return true;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return false;
    }
  }, [isAuthenticated, socket, signalProtocol]);

  // Отправка файла
  const sendFile = useCallback(async (recipientId, file) => {
    if (!isAuthenticated || !file) return null;

    try {
      // Загружаем файл на сервер
      const uploadResult = await filesApi.uploadFile(file);
      
      if (uploadResult && uploadResult.file_id) {
        // Создаем текст сообщения с информацией о файле
        const fileInfo = {
          id: uploadResult.file_id,
          name: file.name,
          size: file.size,
          type: file.type
        };
        
        // Преобразуем информацию о файле в JSON строку
        const fileInfoJson = JSON.stringify(fileInfo);
        
        // Отправляем сообщение с информацией о файле
        await sendMessage(recipientId, fileInfoJson, uploadResult.file_id);
        
        return uploadResult.file_id;
      }
      return null;
    } catch (error) {
      console.error('Ошибка отправки файла:', error);
      return null;
    }
  }, [isAuthenticated, filesApi, sendMessage]);

  // Выбор пользователя для чата
  const selectUser = useCallback(async (user) => {
    setSelectedUser(user);
    
    if (user) {
      await loadMessages(user.id);
    }
  }, [loadMessages]);

  // Значение контекста
  const contextValue = {
    users,
    selectedUser,
    messages,
    isConnected,
    unreadCounts,
    selectUser,
    sendMessage,
    sendFile,
    signalProtocol
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}; 