import React, { useState } from 'react';
import { Table, Button, Badge, Form, InputGroup, Modal, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faBan, faUnlock, faSearch, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { useAdmin } from '../../contexts/AdminContext';
import { useAuth } from '../../contexts/AuthContext';

const UsersList = ({ users }) => {
  const { user: currentUser } = useAuth();
  const { deleteUser, blockUser, unblockUser, updateUser } = useAdmin();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Фильтрация пользователей по строке поиска
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Обработчик изменения формы редактирования
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm({
      ...editForm,
      [name]: value
    });
  };
  
  // Открытие модального окна удаления
  const handleShowDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };
  
  // Открытие модального окна редактирования
  const handleShowEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email || '',
      role: user.role || 'user'
    });
    setShowEditModal(true);
  };
  
  // Удаление пользователя
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const result = await deleteUser(selectedUser.id);
      if (result.success) {
        setSuccess(`Пользователь ${selectedUser.username} успешно удален`);
        setShowDeleteModal(false);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Ошибка при удалении пользователя');
      console.error(error);
    }
  };
  
  // Блокировка/разблокировка пользователя
  const handleToggleBlock = async (user) => {
    try {
      if (user.status === 'blocked') {
        const result = await unblockUser(user.id);
        if (result.success) {
          setSuccess(`Пользователь ${user.username} разблокирован`);
        } else {
          setError(result.error);
        }
      } else {
        const result = await blockUser(user.id);
        if (result.success) {
          setSuccess(`Пользователь ${user.username} заблокирован`);
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError('Ошибка при изменении статуса пользователя');
      console.error(error);
    }
  };
  
  // Сохранение изменений пользователя
  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      const result = await updateUser(selectedUser.id, editForm);
      if (result.success) {
        setSuccess(`Данные пользователя ${selectedUser.username} обновлены`);
        setShowEditModal(false);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Ошибка при обновлении данных пользователя');
      console.error(error);
    }
  };
  
  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Получение статуса пользователя с цветным индикатором
  const getUserStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge bg="success">Активен</Badge>;
      case 'blocked':
        return <Badge bg="danger">Заблокирован</Badge>;
      case 'pending':
        return <Badge bg="warning">Ожидает активации</Badge>;
      default:
        return <Badge bg="secondary">Неизвестно</Badge>;
    }
  };
  
  return (
    <div className="users-list-container">
      <h3 className="mb-4">Управление пользователями</h3>
      
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}
      
      <InputGroup className="mb-3">
        <InputGroup.Text>
          <FontAwesomeIcon icon={faSearch} />
        </InputGroup.Text>
        <Form.Control
          placeholder="Поиск пользователей..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>
      
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя пользователя</th>
            <th>Email</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Дата регистрации</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email || '—'}</td>
                <td>
                  {user.role === 'admin' ? (
                    <Badge bg="primary">Администратор</Badge>
                  ) : (
                    <Badge bg="secondary">Пользователь</Badge>
                  )}
                </td>
                <td>{getUserStatusBadge(user.status)}</td>
                <td>{formatDate(user.created_at)}</td>
                <td className="user-actions">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => handleShowEditModal(user)}
                    title="Редактировать пользователя"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </Button>
                  
                  {user.id !== currentUser.id && (
                    <>
                      <Button
                        variant={user.status === 'blocked' ? 'outline-success' : 'outline-warning'}
                        size="sm"
                        onClick={() => handleToggleBlock(user)}
                        title={user.status === 'blocked' ? 'Разблокировать пользователя' : 'Заблокировать пользователя'}
                        className="ms-1"
                      >
                        <FontAwesomeIcon icon={user.status === 'blocked' ? faUnlock : faBan} />
                      </Button>
                      
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleShowDeleteModal(user)}
                        title="Удалить пользователя"
                        className="ms-1"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center">
                {searchTerm ? 'Пользователи не найдены' : 'Нет пользователей'}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      
      {/* Модальное окно удаления пользователя */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <p>
              Вы действительно хотите удалить пользователя <strong>{selectedUser.username}</strong>?
              Это действие нельзя будет отменить.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteUser}>
            Удалить
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Модальное окно редактирования пользователя */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактирование пользователя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Имя пользователя</Form.Label>
                <Form.Control
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleEditFormChange}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditFormChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Роль</Form.Label>
                <Form.Select
                  name="role"
                  value={editForm.role}
                  onChange={handleEditFormChange}
                  disabled={selectedUser.id === currentUser.id} // Нельзя изменить свою роль
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </Form.Select>
                {selectedUser.id === currentUser.id && (
                  <Form.Text className="text-muted">
                    Вы не можете изменить свою роль
                  </Form.Text>
                )}
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSaveUser}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UsersList; 