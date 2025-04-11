import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tab, Nav, Table, Button, Form, Alert, Badge, Modal, Spinner } from 'react-bootstrap';
import { useAdmin } from '../../contexts/AdminContext';
import { useAuth } from '../../contexts/AuthContext';
import UsersList from './UsersList';
import UserForm from './UserForm';
import SystemSettings from './SystemSettings';
import Statistics from './Statistics';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faUsers, 
  faTrash, 
  faEdit, 
  faUserPlus, 
  faChartLine, 
  faCog, 
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faServer,
  faDatabase
} from '@fortawesome/free-solid-svg-icons';
import API from '../../utils/api';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useAuth();
  const { 
    users, 
    settings, 
    loading, 
    error, 
    loadUsers, 
    updateSettings, 
    toggleRegistration, 
    createUser, 
    updateUser, 
    toggleUserBlock, 
    deleteUser,
    getStats
  } = useAdmin();
  
  const [stats, setStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    display_name: '',
    password: '',
    confirm_password: '',
    role: 'user'
  });
  const [formError, setFormError] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [validated, setValidated] = useState(false);
  const [apiError, setApiError] = useState('');

  // Загрузка статистики при монтировании
  useEffect(() => {
    const loadStats = async () => {
      setDashboardLoading(true);
      const statsData = await getStats();
      if (statsData) {
        setStats(statsData);
      }
      setDashboardLoading(false);
    };
    
    loadStats();
  }, [getStats]);
  
  // Загрузка статуса системы при монтировании
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const statusResponse = await API.get('/system/status');
        setSystemStatus(statusResponse.data);
      } catch (error) {
        console.error('Ошибка при загрузке статуса системы:', error);
        setApiError('Не удалось загрузить статус системы. Пожалуйста, попробуйте позже.');
      }
    };
    
    fetchSystemStatus();
  }, []);
  
  // Обработчик изменения настройки регистрации
  const handleToggleRegistration = async () => {
    await toggleRegistration(!settings.registrationEnabled);
  };
  
  // Обработчик изменения формы пользователя
  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Обработчик отправки формы создания пользователя
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Проверка паролей
    if (userForm.password !== userForm.confirm_password) {
      return setFormError('Пароли не совпадают');
    }
    
    // Проверка email
    if (!userForm.email.includes('@')) {
      return setFormError('Пожалуйста, введите корректный email');
    }
    
    const userData = {
      username: userForm.username,
      email: userForm.email,
      display_name: userForm.display_name,
      password: userForm.password,
      role: userForm.role
    };
    
    const result = await createUser(userData);
    
    if (result) {
      // Очистка формы и закрытие модального окна
      setUserForm({
        username: '',
        email: '',
        display_name: '',
        password: '',
        confirm_password: '',
        role: 'user'
      });
      setShowCreateModal(false);
    }
  };
  
  // Обработчик отправки формы редактирования пользователя
  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Проверка email
    if (!userForm.email.includes('@')) {
      return setFormError('Пожалуйста, введите корректный email');
    }
    
    const userData = {
      email: userForm.email,
      display_name: userForm.display_name,
      role: userForm.role
    };
    
    // Добавляем пароль, только если он был введен
    if (userForm.password) {
      if (userForm.password !== userForm.confirm_password) {
        return setFormError('Пароли не совпадают');
      }
      userData.password = userForm.password;
    }
    
    const result = await updateUser(selectedUser.id, userData);
    
    if (result) {
      // Очистка формы и закрытие модального окна
      setUserForm({
        username: '',
        email: '',
        display_name: '',
        password: '',
        confirm_password: '',
        role: 'user'
      });
      setShowEditModal(false);
      setSelectedUser(null);
    }
  };
  
  // Обработчик удаления пользователя
  const handleDeleteUserConfirm = async () => {
    if (selectedUser) {
      await deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };
  
  // Обработчик блокировки/разблокировки пользователя
  const handleToggleBlock = async (userId, currentState) => {
    await toggleUserBlock(userId, !currentState);
  };
  
  // Открытие модального окна редактирования пользователя
  const openEditModal = (user) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      email: user.email || '',
      display_name: user.display_name || '',
      password: '',
      confirm_password: '',
      role: user.role || 'user'
    });
    setShowEditModal(true);
  };
  
  // Открытие модального окна удаления пользователя
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleAddUser = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    
    setValidated(true);
    
    try {
      const response = await API.post('/users', userForm);
      loadUsers([...users, response.data]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Ошибка при добавлении пользователя:', error);
      setApiError('Не удалось добавить пользователя. ' + (error.response?.data?.message || 'Пожалуйста, попробуйте позже.'));
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm({
      ...userForm,
      [name]: value
    });
  };
  
  const resetForm = () => {
    setUserForm({
      username: '',
      email: '',
      display_name: '',
      password: '',
      confirm_password: '',
      role: 'user'
    });
    setValidated(false);
    setApiError('');
  };

  // Если пользователь не является администратором, показываем сообщение об ошибке
  if (user?.role !== 'admin') {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Отказано в доступе</Alert.Heading>
          <p>У вас нет прав для доступа к административной панели.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Card>
        <Card.Header>
          <h4 className="mb-0">Администрирование</h4>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Tab.Container id="admin-tabs" defaultActiveKey="dashboard">
            <Row>
              <Col sm={3}>
                <Nav variant="pills" className="flex-column mb-3">
                  <Nav.Item>
                    <Nav.Link eventKey="dashboard">Обзор</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="users">Пользователи</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="settings">Настройки</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>
              <Col sm={9}>
                <Tab.Content>
                  {/* Вкладка обзора */}
                  <Tab.Pane eventKey="dashboard">
                    <h5 className="mb-4">Статистика системы</h5>
                    
                    {dashboardLoading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Загрузка статистики...</p>
                      </div>
                    ) : stats ? (
                      <Row>
                        <Col md={4} className="mb-3">
                          <Card className="text-center h-100">
                            <Card.Body>
                              <h2 className="display-4">{stats.userCount}</h2>
                              <Card.Title>Пользователей</Card.Title>
                            </Card.Body>
                          </Card>
                        </Col>
                        <Col md={4} className="mb-3">
                          <Card className="text-center h-100">
                            <Card.Body>
                              <h2 className="display-4">{stats.activeUsers}</h2>
                              <Card.Title>Активны сегодня</Card.Title>
                            </Card.Body>
                          </Card>
                        </Col>
                        <Col md={4} className="mb-3">
                          <Card className="text-center h-100">
                            <Card.Body>
                              <h2 className="display-4">{stats.messageCount}</h2>
                              <Card.Title>Сообщений</Card.Title>
                            </Card.Body>
                          </Card>
                        </Col>
                        {stats.diskUsage && (
                          <Col md={6} className="mb-3">
                            <Card>
                              <Card.Body>
                                <Card.Title>Использование диска</Card.Title>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <div className="progress w-75">
                                    <div
                                      className={`progress-bar ${stats.diskUsage.percentage > 80 ? 'bg-danger' : stats.diskUsage.percentage > 60 ? 'bg-warning' : 'bg-success'}`}
                                      role="progressbar"
                                      style={{ width: `${stats.diskUsage.percentage}%` }}
                                      aria-valuenow={stats.diskUsage.percentage}
                                      aria-valuemin="0"
                                      aria-valuemax="100"
                                    />
                                  </div>
                                  <span>{stats.diskUsage.percentage}%</span>
                                </div>
                                <div className="small text-muted mt-2">
                                  {stats.diskUsage.used} / {stats.diskUsage.total}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        )}
                        {stats.memoryUsage && (
                          <Col md={6} className="mb-3">
                            <Card>
                              <Card.Body>
                                <Card.Title>Использование памяти</Card.Title>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <div className="progress w-75">
                                    <div
                                      className={`progress-bar ${stats.memoryUsage.percentage > 80 ? 'bg-danger' : stats.memoryUsage.percentage > 60 ? 'bg-warning' : 'bg-success'}`}
                                      role="progressbar"
                                      style={{ width: `${stats.memoryUsage.percentage}%` }}
                                      aria-valuenow={stats.memoryUsage.percentage}
                                      aria-valuemin="0"
                                      aria-valuemax="100"
                                    />
                                  </div>
                                  <span>{stats.memoryUsage.percentage}%</span>
                                </div>
                                <div className="small text-muted mt-2">
                                  {stats.memoryUsage.used} / {stats.memoryUsage.total}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        )}
                      </Row>
                    ) : (
                      <Alert variant="info">Нет доступной статистики</Alert>
                    )}
                  </Tab.Pane>
                  
                  {/* Вкладка пользователей */}
                  <Tab.Pane eventKey="users">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Управление пользователями</h5>
                      <Button variant="primary" onClick={() => setShowAddUserModal(true)}>
                        <FontAwesomeIcon icon={faUserPlus} className="me-1" />
                        Добавить пользователя
                      </Button>
                    </div>
                    
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Загрузка пользователей...</p>
                      </div>
                    ) : users && users.length > 0 ? (
                      <div className="table-responsive">
                        <Table striped bordered hover>
                          <thead>
                            <tr>
                              <th>Имя пользователя</th>
                              <th>Email</th>
                              <th>Роль</th>
                              <th>Статус</th>
                              <th>Действия</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map(user => (
                              <tr key={user.id}>
                                <td>{user.display_name || user.username}</td>
                                <td>{user.email}</td>
                                <td>
                                  {user.role === 'admin' ? (
                                    <Badge bg="danger">Администратор</Badge>
                                  ) : (
                                    <Badge bg="secondary">Пользователь</Badge>
                                  )}
                                </td>
                                <td>
                                  {user.blocked ? (
                                    <Badge bg="danger">Заблокирован</Badge>
                                  ) : (
                                    <Badge bg="success">Активен</Badge>
                                  )}
                                </td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <Button 
                                      variant="outline-secondary" 
                                      size="sm"
                                      onClick={() => openEditModal(user)}
                                    >
                                      Редактировать
                                    </Button>
                                    <Button 
                                      variant={user.blocked ? "outline-success" : "outline-warning"} 
                                      size="sm"
                                      onClick={() => handleToggleBlock(user.id, user.blocked)}
                                    >
                                      {user.blocked ? "Разблокировать" : "Заблокировать"}
                                    </Button>
                                    <Button 
                                      variant="outline-danger" 
                                      size="sm"
                                      onClick={() => openDeleteModal(user)}
                                    >
                                      Удалить
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <Alert variant="info">Нет пользователей для отображения</Alert>
                    )}
                  </Tab.Pane>
                  
                  {/* Вкладка настроек */}
                  <Tab.Pane eventKey="settings">
                    <h5 className="mb-4">Настройки системы</h5>
                    
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Check 
                          type="switch"
                          id="registration-enabled"
                          label="Регистрация пользователей разрешена"
                          checked={settings.registrationEnabled}
                          onChange={handleToggleRegistration}
                        />
                        <Form.Text className="text-muted">
                          Когда регистрация отключена, новые пользователи не могут создавать аккаунты. Только администратор может создавать новых пользователей.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Максимальный размер загружаемых файлов (МБ)</Form.Label>
                        <Form.Control 
                          type="number" 
                          value={settings.maxUploadSize} 
                          onChange={(e) => updateSettings({ maxUploadSize: parseInt(e.target.value, 10) })}
                          min="1"
                          max="100"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Время хранения сообщений (дней)</Form.Label>
                        <Form.Control 
                          type="number" 
                          value={settings.messageRetentionDays} 
                          onChange={(e) => updateSettings({ messageRetentionDays: parseInt(e.target.value, 10) })}
                          min="1"
                        />
                        <Form.Text className="text-muted">
                          Сообщения старше указанного срока будут автоматически удалены для экономии места.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Максимальное время звонка (секунд)</Form.Label>
                        <Form.Control 
                          type="number" 
                          value={settings.callTimeout} 
                          onChange={(e) => updateSettings({ callTimeout: parseInt(e.target.value, 10) })}
                          min="10"
                          max="300"
                        />
                        <Form.Text className="text-muted">
                          Время ожидания ответа на звонок.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Максимальное количество участников в групповом чате</Form.Label>
                        <Form.Control 
                          type="number" 
                          value={settings.maxGroupSize} 
                          onChange={(e) => updateSettings({ maxGroupSize: parseInt(e.target.value, 10) })}
                          min="2"
                          max="100"
                        />
                      </Form.Group>
                    </Form>
                  </Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        </Card.Body>
      </Card>
      
      {/* Модальное окно создания пользователя */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Создание нового пользователя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && <Alert variant="danger">{formError}</Alert>}
          
          <Form noValidate validated={validated} onSubmit={handleAddUser}>
            <Form.Group className="mb-3">
              <Form.Label>Имя пользователя</Form.Label>
              <Form.Control 
                type="text" 
                name="username" 
                value={userForm.username} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control 
                type="email" 
                name="email" 
                value={userForm.email} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Отображаемое имя</Form.Label>
              <Form.Control 
                type="text" 
                name="display_name" 
                value={userForm.display_name} 
                onChange={handleInputChange} 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Пароль</Form.Label>
              <Form.Control 
                type="password" 
                name="password" 
                value={userForm.password} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Подтверждение пароля</Form.Label>
              <Form.Control 
                type="password" 
                name="confirm_password" 
                value={userForm.confirm_password} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Роль</Form.Label>
              <Form.Select 
                name="role" 
                value={userForm.role} 
                onChange={handleInputChange}
              >
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
              </Form.Select>
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowCreateModal(false)}>
                Отмена
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Создание...' : 'Создать пользователя'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Модальное окно редактирования пользователя */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактирование пользователя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && <Alert variant="danger">{formError}</Alert>}
          
          <Form noValidate validated={validated} onSubmit={handleEditUserSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Имя пользователя</Form.Label>
              <Form.Control 
                type="text" 
                value={userForm.username} 
                disabled 
              />
              <Form.Text className="text-muted">
                Имя пользователя не может быть изменено
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control 
                type="email" 
                name="email" 
                value={userForm.email} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Отображаемое имя</Form.Label>
              <Form.Control 
                type="text" 
                name="display_name" 
                value={userForm.display_name} 
                onChange={handleInputChange} 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Новый пароль</Form.Label>
              <Form.Control 
                type="password" 
                name="password" 
                value={userForm.password} 
                onChange={handleInputChange} 
                placeholder="Оставьте пустым, чтобы не менять" 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Подтверждение нового пароля</Form.Label>
              <Form.Control 
                type="password" 
                name="confirm_password" 
                value={userForm.confirm_password} 
                onChange={handleInputChange} 
                placeholder="Оставьте пустым, чтобы не менять" 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Роль</Form.Label>
              <Form.Select 
                name="role" 
                value={userForm.role} 
                onChange={handleInputChange}
              >
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
              </Form.Select>
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowEditModal(false)}>
                Отмена
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Модальное окно удаления пользователя */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Вы уверены, что хотите удалить пользователя <strong>{selectedUser?.username}</strong>?
          </p>
          <p className="text-danger">
            Это действие невозможно отменить. Все данные пользователя будут удалены.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteUserConfirm} disabled={loading}>
            {loading ? 'Удаление...' : 'Удалить пользователя'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminPanel; 