import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckDouble, faCheck, faClock, faDownload, faFile } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import './MessagesList.css';

const MessagesList = ({ messages = [] }) => {
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  
  // Функция для определения, группировать ли сообщения
  const shouldGroupMessages = (current, prev) => {
    if (!prev) return false;
    return (
      current.senderId === prev.senderId && 
      new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime() < 60000 // 1 минута
    );
  };
  
  // Прокрутка к последнему сообщению при изменении списка сообщений
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Форматирование времени
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Форматирование даты для разделителя
  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  };
  
  // Определение иконки статуса сообщения
  const getStatusIcon = (message) => {
    if (message.senderId === currentUser?.id) {
      if (message.status === 'sent') {
        return <FontAwesomeIcon icon={faCheck} className="message-status-icon" />;
      } else if (message.status === 'delivered') {
        return <FontAwesomeIcon icon={faCheckDouble} className="message-status-icon" />;
      } else if (message.status === 'read') {
        return <FontAwesomeIcon icon={faCheckDouble} className="message-status-icon read" />;
      } else {
        return <FontAwesomeIcon icon={faClock} className="message-status-icon" />;
      }
    }
    return null;
  };
  
  // Функция для отображения разделителя даты
  const needsDateSeparator = (current, prev) => {
    if (!prev) return true;
    
    const currentDate = new Date(current.timestamp).setHours(0, 0, 0, 0);
    const prevDate = new Date(prev.timestamp).setHours(0, 0, 0, 0);
    
    return currentDate !== prevDate;
  };
  
  // Получение информации о типе файла
  const getFileInfo = (fileUrl) => {
    if (!fileUrl) return { icon: faFile, type: 'Файл' };
    
    const extension = fileUrl.split('.').pop().toLowerCase();
    
    // Определяем тип файла
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    
    if (imageExtensions.includes(extension)) {
      return { icon: faFile, type: 'Изображение', isImage: true };
    } else if (videoExtensions.includes(extension)) {
      return { icon: faFile, type: 'Видео' };
    } else if (audioExtensions.includes(extension)) {
      return { icon: faFile, type: 'Аудио' };
    } else if (documentExtensions.includes(extension)) {
      return { icon: faFile, type: 'Документ' };
    }
    
    return { icon: faFile, type: 'Файл' };
  };
  
  return (
    <div className="messages-list">
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isFromMe = message.senderId === currentUser?.id;
        const isGrouped = shouldGroupMessages(message, prevMessage);
        const showDateSeparator = needsDateSeparator(message, prevMessage);
        
        return (
          <React.Fragment key={message.id || index}>
            {showDateSeparator && (
              <div className="date-separator">
                <span>{formatDateSeparator(message.timestamp)}</span>
              </div>
            )}
            
            <div 
              className={`message-container ${isFromMe ? 'message-from-me' : 'message-from-other'} ${isGrouped ? 'grouped' : ''}`}
            >
              {!isFromMe && !isGrouped && (
                <div className="message-avatar">
                  {message.avatar ? (
                    <img src={message.avatar} alt={message.senderName} />
                  ) : (
                    <div className="message-avatar-placeholder">
                      {message.senderName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              
              <div className={`message-bubble ${isFromMe ? 'from-me' : 'from-other'}`}>
                {!isFromMe && !isGrouped && (
                  <div className="message-sender">{message.senderName}</div>
                )}
                
                {/* Отображение текста сообщения */}
                {message.text && (
                  <div className="message-text">{message.text}</div>
                )}
                
                {/* Отображение вложений */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="message-attachments">
                    {message.attachments.map((attachment, i) => {
                      const fileInfo = getFileInfo(attachment.url);
                      
                      return fileInfo.isImage ? (
                        <div key={i} className="message-image-container">
                          <img 
                            src={attachment.url} 
                            alt="Вложение" 
                            className="message-image"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div key={i} className="message-file">
                          <div className="message-file-icon">
                            <FontAwesomeIcon icon={fileInfo.icon} />
                          </div>
                          <div className="message-file-info">
                            <div className="message-file-name">{attachment.name || 'Файл'}</div>
                            <div className="message-file-size">{attachment.size || ''}</div>
                          </div>
                          <a 
                            href={attachment.url} 
                            className="message-file-download" 
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FontAwesomeIcon icon={faDownload} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="message-meta">
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                  {getStatusIcon(message)}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessagesList; 