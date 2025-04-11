import React, { useState } from 'react';
import { Dropdown, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faVideo, faInfoCircle, faEllipsisV, faUser, faCircle } from '@fortawesome/free-solid-svg-icons';
import { useCall } from '../../contexts/CallContext';
import ChatInfoModal from './ChatInfoModal';
import './ChatHeader.css';

const ChatHeader = ({ chat }) => {
  const { initiateCall } = useCall();
  const [showChatInfo, setShowChatInfo] = useState(false);
  
  if (!chat) return null;
  
  // Получение данных о собеседнике для личных чатов
  const getRecipientData = () => {
    if (chat.type === 'private') {
      // Находим другого пользователя (не себя)
      const otherUser = chat.users?.find(u => u.username !== 'me');
      return {
        name: otherUser?.username || 'Пользователь',
        status: otherUser?.status || 'offline',
        avatar: otherUser?.avatar || null
      };
    } else {
      // Для групповых чатов
      return {
        name: chat.name || 'Групповой чат',
        status: `${chat.users?.length || 0} участников`,
        avatar: chat.avatar || null
      };
    }
  };
  
  const recipientData = getRecipientData();
  
  // Начать аудио вызов
  const handleAudioCall = () => {
    initiateCall(chat.id, false);
  };
  
  // Начать видео вызов
  const handleVideoCall = () => {
    initiateCall(chat.id, true);
  };
  
  // Открыть информацию о чате
  const handleChatInfo = () => {
    setShowChatInfo(true);
  };
  
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="chat-avatar">
          {recipientData.avatar ? (
            <img 
              src={recipientData.avatar} 
              alt="Avatar" 
              className="chat-avatar-img" 
            />
          ) : (
            <div className="chat-avatar-placeholder">
              {recipientData.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="chat-recipient-info">
          <div className="chat-recipient-name">
            {recipientData.name}
          </div>
          <div className="chat-recipient-status">
            {chat.type === 'private' && recipientData.status === 'online' && (
              <>
                <FontAwesomeIcon icon={faCircle} className="status-icon online" />
                <span>Онлайн</span>
              </>
            )}
            
            {chat.type === 'private' && recipientData.status === 'offline' && (
              <span className="text-muted">Не в сети</span>
            )}
            
            {chat.type === 'group' && (
              <span className="text-muted">{recipientData.status}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="chat-header-actions">
        {chat.type === 'private' && (
          <>
            <Button 
              variant="light" 
              className="chat-action-btn" 
              onClick={handleAudioCall}
              title="Аудио звонок"
            >
              <FontAwesomeIcon icon={faPhone} />
            </Button>
            
            <Button 
              variant="light" 
              className="chat-action-btn" 
              onClick={handleVideoCall}
              title="Видео звонок"
            >
              <FontAwesomeIcon icon={faVideo} />
            </Button>
          </>
        )}
        
        <Button 
          variant="light" 
          className="chat-action-btn" 
          onClick={handleChatInfo}
          title="Информация о чате"
        >
          <FontAwesomeIcon icon={faInfoCircle} />
        </Button>
        
        <Dropdown>
          <Dropdown.Toggle variant="light" className="chat-action-btn">
            <FontAwesomeIcon icon={faEllipsisV} />
          </Dropdown.Toggle>
          
          <Dropdown.Menu>
            <Dropdown.Item onClick={handleChatInfo}>
              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
              Информация о чате
            </Dropdown.Item>
            <Dropdown.Item>
              <FontAwesomeIcon icon={faUser} className="me-2" />
              Профиль пользователя
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item className="text-danger">
              Очистить историю
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
      
      {/* Модальное окно с информацией о чате */}
      <ChatInfoModal 
        show={showChatInfo} 
        onHide={() => setShowChatInfo(false)} 
        chat={chat} 
      />
    </div>
  );
};

export default ChatHeader; 