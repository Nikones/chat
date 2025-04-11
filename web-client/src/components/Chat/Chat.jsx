import React, { useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useMessages } from '../../contexts/MessageContext';
import { useWebSocket } from '../../WebSocketContext';
import ChatHeader from './ChatHeader';
import MessagesList from './MessagesList';
import MessageInput from './MessageInput';
import WelcomeScreen from './WelcomeScreen';
import './Chat.css';

const Chat = () => {
  const { activeChat, messages, loading, error, loadChats } = useMessages();
  const { ready, isConnected, error: wsError } = useWebSocket();
  
  // Загружаем чаты при монтировании компонента, если их нет
  useEffect(() => {
    if (!activeChat) {
      loadChats();
    }
  }, [activeChat, loadChats]);
  
  // Показываем спиннер, если WebSocket не готов
  if (!ready) {
    return (
      <div className="chat-loading-container">
        <Spinner animation="border" variant="primary" />
        <h5 className="mt-3">Подключение к серверу сообщений...</h5>
        <p className="text-muted">Пожалуйста, подождите</p>
      </div>
    );
  }
  
  // Если есть ошибка WebSocket
  if (wsError) {
    return (
      <div className="chat-error-container">
        <Alert variant="danger">
          <Alert.Heading>Ошибка подключения</Alert.Heading>
          <p>{wsError}</p>
          <p>Пожалуйста, обновите страницу или попробуйте позже.</p>
        </Alert>
      </div>
    );
  }
  
  // Если нет активного чата, показываем экран приветствия
  if (!activeChat) {
    return <WelcomeScreen />;
  }
  
  // Получаем сообщения для текущего чата
  const chatMessages = messages[activeChat.id] || [];
  
  return (
    <div className="chat-container">
      {/* Заголовок чата */}
      <ChatHeader chat={activeChat} isConnected={isConnected} />
      
      {/* Область сообщений */}
      <div className="messages-container">
        {error && (
          <Alert variant="danger" className="mx-3 mt-3">
            {error}
          </Alert>
        )}
        
        {loading ? (
          <div className="loading-messages-indicator">
            <Spinner animation="border" variant="primary" size="sm" className="me-2" />
            Загрузка сообщений...
          </div>
        ) : (
          <MessagesList messages={chatMessages} />
        )}
      </div>
      
      {/* Индикатор статуса соединения */}
      {!isConnected && (
        <div className="connection-status-indicator">
          <Spinner animation="grow" variant="warning" size="sm" className="me-2" />
          Переподключение...
        </div>
      )}
      
      {/* Ввод сообщения */}
      <div className="message-input-container">
        <MessageInput 
          chatId={activeChat.id} 
          disabled={!isConnected}
          placeholderText={!isConnected ? "Соединение потеряно..." : "Введите сообщение..."}
        />
      </div>
    </div>
  );
};

export default Chat; 