import React from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faLock, faComments } from '@fortawesome/free-solid-svg-icons';
import { useMessages } from '../../contexts/MessageContext';
import './WelcomeScreen.css';

const WelcomeScreen = () => {
  const { createChat } = useMessages();
  
  const handleNewChat = () => {
    // Открытие модального окна для создания нового чата
    // (будет реализовано через глобальное состояние или контекст)
    console.log('Creating new chat');
  };
  
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <FontAwesomeIcon icon={faComments} />
        </div>
        
        <h1 className="welcome-title">Добро пожаловать в Messenger</h1>
        
        <p className="welcome-text">
          Выберите чат из списка слева или начните новый разговор
        </p>
        
        <div className="welcome-features">
          <div className="feature-item">
            <div className="feature-icon">
              <FontAwesomeIcon icon={faUserPlus} />
            </div>
            <div className="feature-info">
              <h3>Личные и групповые чаты</h3>
              <p>Общайтесь один на один или создавайте группы</p>
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">
              <FontAwesomeIcon icon={faLock} />
            </div>
            <div className="feature-info">
              <h3>Шифрование сообщений</h3>
              <p>Ваша переписка надежно защищена</p>
            </div>
          </div>
        </div>
        
        <Button 
          variant="primary" 
          size="lg" 
          className="mt-4"
          onClick={handleNewChat}
        >
          <FontAwesomeIcon icon={faUserPlus} className="me-2" />
          Начать новый чат
        </Button>
      </div>
    </div>
  );
};

export default WelcomeScreen; 