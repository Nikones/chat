import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { 
  Table, 
  Button, 
  Badge, 
  Form,
  Modal,
  Alert
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faTrash, 
  faLock, 
  faUnlock 
} from '@fortawesome/free-solid-svg-icons';

const UserManagement = () => {
  const { 
    users, 
    deleteUser, 
    updateUser, 
    toggleUserBlock 
  } = useAdmin();
  
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

  // Обработчик изменения формы пользователя
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm({
      ...userForm,
      [name]: value
    });
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

  return (
    <div>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Имя пользователя</th>
            <th>Email</th>
            <th>Отображаемое имя</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users && users.map(user => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{user.display_name || '-'}</td>
              <td>
                <Badge bg={user.role === 'admin' ? 'danger' : 'info'}>
                  {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </Badge>
              </td>
              <td>
                <Badge bg={user.blocked ? 'danger' : 'success'}>
                  {user.blocked ? 'Заблокирован' : 'Активен'}
                </Badge>
              </td>
              <td>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="me-1" 
                  onClick={() => openEditModal(user)}
                >
                  <FontAwesomeIcon icon={faEdit} />
                </Button>
                <Button 
                  variant={user.blocked ? 'success' : 'warning'} 
                  size="sm" 
                  className="me-1"
                  onClick={() => handleToggleBlock(user.id, user.blocked)}
                >
                  <FontAwesomeIcon icon={user.blocked ? faUnlock : faLock} />
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => openDeleteModal(user)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Модальное окно редактирования пользователя */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактирование пользователя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && <Alert variant="danger">{formError}</Alert>}
          
          <Form onSubmit={handleEditUserSubmit}>
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
              />
              <Form.Text className="text-muted">
                Оставьте пустым, если не хотите менять пароль
              </Form.Text>
            </Form.Group>
            
            {userForm.password && (
              <Form.Group className="mb-3">
                <Form.Label>Подтверждение пароля</Form.Label>
                <Form.Control 
                  type="password" 
                  name="confirm_password" 
                  value={userForm.confirm_password} 
                  onChange={handleInputChange} 
                  required={!!userForm.password}
                />
              </Form.Group>
            )}
            
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
              <Button variant="primary" type="submit">
                Сохранить изменения
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
          <p>Вы действительно хотите удалить пользователя "{selectedUser?.username}"?</p>
          <p className="text-danger">Это действие невозможно отменить.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteUserConfirm}>
            Удалить
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManagement; 