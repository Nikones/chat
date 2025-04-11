import React, { useState, useEffect } from 'react';
import { Nav, InputGroup, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faPlus, 
  faUserFriends, 
  faUsers, 
  faComments, 
  faCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { useMessages } from '../../contexts/MessageContext';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { chats, loadChats, setActiveChat, activeChat, loading: chatsLoading } = useMessages();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChats, setFilteredChats] = useState([]);
  const [chatType, setChatType] = useState('all'); // all, private, group
  
  // Загрузка списка чатов
  useEffect(() => {
    if (!chats || chats.length === 0) {
      loadChats();
    }
  }, [chats, loadChats]);
  
  // Фильтрация чатов при изменении поискового запроса или типа чата
  useEffect(() => {
    if (!chats || chats.length === 0) {
      setFilteredChats([]);
      return;
    }
    
    let filtered = [...chats];
    
    // Фильтрация по типу чата
    if (chatType !== 'all') {
      filtered = filtered.filter(chat => chat.type === chatType);
    }
    
    // Фильтрация по поисковому запросу
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(chat => {
        // Поиск по названию чата или имени пользователя
        return chat.name?.toLowerCase().includes(term) || 
               chat.users?.some(user => user.username.toLowerCase().includes(term));
      });
    }
    
    // Сортировка по дате последнего сообщения (новые сверху)
    filtered.sort((a, b) => {
      if (!a.last_message && !b.last_message) return 0;
      if (!a.last_message) return 1;
      if (!b.last_message) return -1;
      
      return new Date(b.last_message.created_at) - new Date(a.last_message.created_at);
    });
    
    setFilteredChats(filtered);
  }, [chats, searchTerm, chatType]);
  
  // Обработчик выбора чата
  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };
  
  // Обработчик создания нового чата
  const handleNewChat = () => {
    console.log('Создание нового чата');
    // Здесь будет логика создания нового чата
  };
  
  // Получение данных для отображения чата
  const getChatDisplayData = (chat) => {
    if (!chat) return { name: 'Неизвестный', avatar: null, isOnline: false };
    
    if (chat.type === 'private') {
      // Для личных чатов показываем имя собеседника
      const otherUser = chat.users?.find(u => u.id !== user?.id) || {};
      return {
        name: otherUser.username || 'Пользователь',
        avatar: otherUser.avatar || null,
        isOnline: otherUser.status === 'online'
      };
    } else {
      // Для групповых чатов показываем название группы
      return {
        name: chat.name || 'Групповой чат',
        avatar: chat.avatar,
        isOnline: false
      };
    }
  };
  
  // Получение последнего сообщения для предпросмотра
  const getLastMessagePreview = (chat) => {
    if (!chat.last_message) return 'Нет сообщений';
    
    // Для файлов показываем тип файла
    if (chat.last_message.file) {
      return `📎 ${chat.last_message.file.name || 'Файл'}`;
    }
    
    // Обрезаем длинные сообщения
    const content = chat.last_message.content || '';
    return content.length > 30 ? `${content.substring(0, 30)}...` : content;
  };
  
  // Получение отформатированного времени
  const getFormattedTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
  };
  
  // Если чаты загружаются, показываем индикатор загрузки
  if (chatsLoading) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h5 className="sidebar-title">Чаты</h5>
        </div>
        <div className="sidebar-loading">
          <Spinner animation="border" variant="primary" />
          <p>Загрузка чатов...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h5 className="sidebar-title">Чаты</h5>
        <Button 
          variant="primary" 
          size="sm" 
          title="Новый чат"
          onClick={handleNewChat}
          className="new-chat-btn"
        >
          <FontAwesomeIcon icon={faPlus} />
        </Button>
      </div>
      
      {/* Поиск чатов */}
      <div className="sidebar-search">
        <InputGroup>
          <InputGroup.Text>
            <FontAwesomeIcon icon={faSearch} />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Поиск чатов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>
      
      {/* Фильтры типов чатов */}
      <div className="chat-type-filter">
        <Nav variant="pills" className="chat-type-nav">
          <Nav.Item>
            <Nav.Link 
              active={chatType === 'all'} 
              onClick={() => setChatType('all')}
              className="chat-type-link"
            >
              <FontAwesomeIcon icon={faComments} className="me-1" />
              Все
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={chatType === 'private'} 
              onClick={() => setChatType('private')}
              className="chat-type-link"
            >
              <FontAwesomeIcon icon={faUserFriends} className="me-1" />
              Личные
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={chatType === 'group'} 
              onClick={() => setChatType('group')}
              className="chat-type-link"
            >
              <FontAwesomeIcon icon={faUsers} className="me-1" />
              Группы
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>
      
      {/* Список чатов */}
      <div className="chats-list">
        {filteredChats.length === 0 ? (
          <div className="no-chats-message">
            <FontAwesomeIcon icon={faExclamationTriangle} className="no-chats-icon" />
            <p>{searchTerm ? 'Чаты не найдены' : 'Нет доступных чатов'}</p>
            {!searchTerm && (
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={handleNewChat}
                className="mt-2"
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                Начать новый чат
              </Button>
            )}
          </div>
        ) : (
          filteredChats.map(chat => {
            const displayData = getChatDisplayData(chat);
            const isActive = activeChat?.id === chat.id;
            
            return (
              <div 
                key={chat.id} 
                className={`chat-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectChat(chat)}
              >
                <div className="chat-avatar">
                  {displayData.avatar ? (
                    <img src={displayData.avatar} alt="Avatar" className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      {displayData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {displayData.isOnline && (
                    <span className="online-indicator">
                      <FontAwesomeIcon icon={faCircle} />
                    </span>
                  )}
                </div>
                
                <div className="chat-details">
                  <div className="chat-top-row">
                    <div className="chat-name">{displayData.name}</div>
                    <div className="chat-time">
                      {chat.last_message?.created_at && 
                        getFormattedTime(chat.last_message.created_at)
                      }
                    </div>
                  </div>
                  
                  <div className="chat-bottom-row">
                    <div className="chat-last-message">
                      {getLastMessagePreview(chat)}
                    </div>
                    
                    {chat.unread_count > 0 && (
                      <Badge bg="primary" pill className="unread-badge">
                        {chat.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar; 