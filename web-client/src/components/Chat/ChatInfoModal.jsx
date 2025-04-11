import React, { useState } from 'react';
import { Modal, Button, Tab, Nav, Form, ListGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, faUsersCog, faShield, faBan, faTrash, 
  faInfoCircle, faCamera, faUserPlus, faCircle
} from '@fortawesome/free-solid-svg-icons';
import { useMessages } from '../../contexts/MessageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import './ChatInfoModal.css';

const ChatInfoModal = ({ show, onHide, chat }) => {
  const { currentUser } = useAuth();
  const { updateChatDetails, leaveChat, deleteChat } = useMessages();
  const { blockUser, unblockUser, isAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [chatName, setChatName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  if (!chat) return null;
  
  const isGroupChat = chat.type === 'group';
  const isGroupAdmin = chat.groupAdmin === currentUser?.username;

  // Обработка изменения названия чата
  const handleSubmit = (e) => {
    e.preventDefault();
    if (chatName.trim()) {
      updateChatDetails(chat.id, { name: chatName.trim() });
      setEditMode(false);
    }
  };
  
  // Загрузка аватара чата
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const formData = new FormData();
      formData.append('avatar', file);
      updateChatDetails(chat.id, formData);
    }
  };
  
  // Выход из группового чата
  const handleLeaveChat = () => {
    if (window.confirm('Вы действительно хотите покинуть этот чат?')) {
      leaveChat(chat.id);
      onHide();
    }
  };
  
  // Удаление чата
  const handleDeleteChat = () => {
    if (window.confirm('Вы действительно хотите удалить этот чат?')) {
      deleteChat(chat.id);
      onHide();
    }
  };
  
  // Блокировка пользователя
  const handleBlockUser = (userId) => {
    if (window.confirm('Вы действительно хотите заблокировать этого пользователя?')) {
      blockUser(userId);
    }
  };
  
  // Разблокировка пользователя
  const handleUnblockUser = (userId) => {
    unblockUser(userId);
  };
  
  return (
    <Modal show={show} onHide={onHide} centered className="chat-info-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          {isGroupChat ? 'Информация о группе' : 'Информация о чате'}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Инфо
              </Nav.Link>
            </Nav.Item>
            
            {isGroupChat && (
              <Nav.Item>
                <Nav.Link eventKey="users">
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  Участники
                </Nav.Link>
              </Nav.Item>
            )}
            
            {(isAdmin || isGroupAdmin) && isGroupChat && (
              <Nav.Item>
                <Nav.Link eventKey="admin">
                  <FontAwesomeIcon icon={faUsersCog} className="me-2" />
                  Управление
                </Nav.Link>
              </Nav.Item>
            )}
          </Nav>
          
          <Tab.Content>
            {/* Вкладка с общей информацией */}
            <Tab.Pane eventKey="info">
              <div className="text-center mb-4">
                <div className="chat-avatar-large mx-auto position-relative">
                  {chat.avatar ? (
                    <img 
                      src={chat.avatar} 
                      alt="Avatar" 
                      className="chat-avatar-img" 
                    />
                  ) : (
                    <div className="chat-avatar-placeholder">
                      {isGroupChat ? 
                        chat.name?.charAt(0).toUpperCase() : 
                        chat.users?.find(u => u.username !== currentUser?.username)?.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {(isGroupAdmin || isAdmin) && (
                    <div className="avatar-upload-overlay">
                      <label htmlFor="avatar-upload" className="avatar-upload-label">
                        <FontAwesomeIcon icon={faCamera} />
                      </label>
                      <input 
                        type="file" 
                        id="avatar-upload" 
                        className="avatar-upload-input" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                  )}
                </div>
                
                {/* Имя чата или группы */}
                {!editMode ? (
                  <h4 className="mt-3">
                    {isGroupChat ? 
                      chat.name : 
                      chat.users?.find(u => u.username !== currentUser?.username)?.username}
                    
                    {(isGroupAdmin || isAdmin) && isGroupChat && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 ms-2" 
                        onClick={() => {
                          setChatName(chat.name || '');
                          setEditMode(true);
                        }}
                      >
                        (Изменить)
                      </Button>
                    )}
                  </h4>
                ) : (
                  <Form onSubmit={handleSubmit} className="mt-3">
                    <Form.Group className="d-flex">
                      <Form.Control
                        type="text"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                        placeholder="Название группы"
                        autoFocus
                      />
                      <Button type="submit" variant="primary" className="ms-2">
                        Сохранить
                      </Button>
                      <Button 
                        variant="light" 
                        className="ms-2"
                        onClick={() => setEditMode(false)}
                      >
                        Отмена
                      </Button>
                    </Form.Group>
                  </Form>
                )}
                
                {/* Статистика чата */}
                <div className="chat-stats mt-3">
                  <div className="stat-item">
                    <div className="stat-value">{chat.users?.length || 0}</div>
                    <div className="stat-label">участников</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{chat.messageCount || 0}</div>
                    <div className="stat-label">сообщений</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : '-'}</div>
                    <div className="stat-label">создан</div>
                  </div>
                </div>
              </div>
              
              {/* Описание группы */}
              {isGroupChat && chat.description && (
                <div className="group-description">
                  <h5>Описание</h5>
                  <p>{chat.description}</p>
                </div>
              )}
              
              {/* Кнопки действий */}
              <div className="action-buttons mt-4">
                {isGroupChat && (
                  <Button 
                    variant="outline-danger" 
                    className="me-2" 
                    onClick={handleLeaveChat}
                  >
                    Покинуть группу
                  </Button>
                )}
                
                {((isGroupAdmin && isGroupChat) || (!isGroupChat && currentUser)) && (
                  <Button 
                    variant="danger" 
                    onClick={handleDeleteChat}
                  >
                    Удалить чат
                  </Button>
                )}
              </div>
            </Tab.Pane>
            
            {/* Вкладка с участниками группы */}
            <Tab.Pane eventKey="users">
              <ListGroup>
                {chat.users?.map((user) => (
                  <ListGroup.Item key={user.id} className="d-flex align-items-center">
                    <div className="chat-avatar-small me-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="chat-avatar-img" />
                      ) : (
                        <div className="chat-avatar-placeholder">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center">
                        <span className="fw-medium">{user.username}</span>
                        
                        {user.username === currentUser?.username && (
                          <Badge bg="secondary" className="ms-2">Вы</Badge>
                        )}
                        
                        {user.username === chat.groupAdmin && (
                          <Badge bg="primary" className="ms-2">Админ</Badge>
                        )}
                      </div>
                      
                      <small className="text-muted d-flex align-items-center">
                        {user.status === 'online' ? (
                          <>
                            <FontAwesomeIcon icon={faCircle} className="status-icon online me-1" />
                            Онлайн
                          </>
                        ) : (
                          'Не в сети'
                        )}
                      </small>
                    </div>
                    
                    {(isGroupAdmin || isAdmin) && user.username !== currentUser?.username && (
                      <div className="user-actions">
                        {user.blocked ? (
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => handleUnblockUser(user.id)}
                          >
                            Разблокировать
                          </Button>
                        ) : (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleBlockUser(user.id)}
                          >
                            Блокировать
                          </Button>
                        )}
                      </div>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Tab.Pane>
            
            {/* Вкладка с управлением группой */}
            <Tab.Pane eventKey="admin">
              <div className="admin-tools">
                <h5 className="mb-3">Инструменты управления</h5>
                
                <ListGroup>
                  <ListGroup.Item action className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faUserPlus} className="me-3 text-primary" />
                    <div>
                      <div className="fw-medium">Добавить участников</div>
                      <small className="text-muted">Пригласить новых участников в группу</small>
                    </div>
                  </ListGroup.Item>
                  
                  <ListGroup.Item action className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faBan} className="me-3 text-warning" />
                    <div>
                      <div className="fw-medium">Управление доступом</div>
                      <small className="text-muted">Настройки прав доступа в группе</small>
                    </div>
                  </ListGroup.Item>
                  
                  {isAdmin && (
                    <ListGroup.Item action className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faShield} className="me-3 text-info" />
                      <div>
                        <div className="fw-medium">Администраторские права</div>
                        <small className="text-muted">Назначить администраторов группы</small>
                      </div>
                    </ListGroup.Item>
                  )}
                  
                  <ListGroup.Item action className="d-flex align-items-center text-danger">
                    <FontAwesomeIcon icon={faTrash} className="me-3" />
                    <div>
                      <div className="fw-medium">Удалить группу</div>
                      <small>Безвозвратно удалить эту группу</small>
                    </div>
                  </ListGroup.Item>
                </ListGroup>
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChatInfoModal; 