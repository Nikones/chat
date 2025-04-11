import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faKey, faEnvelope, faUser, faIdCard } from '@fortawesome/free-solid-svg-icons';
import { useAdmin } from '../../contexts/AdminContext';

const UserForm = () => {
  const { createUser } = useAdmin();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    role: 'user',
    first_name: '',
    last_name: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  
  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Валидация формы
  const validateForm = () => {
    // Проверка имени пользователя
    if (!formData.username || formData.username.length < 3) {
      setError('Имя пользователя должно содержать не менее 3 символов');
      return false;
    }
    
    // Проверка пароля
    if (!formData.password || formData.password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return false;
    }
    
    // Проверка совпадения паролей
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }
    
    // Проверка email
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Введите корректный email');
      return false;
    }
    
    return true;
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Устанавливаем флаг валидации формы
    setValidated(true);
    
    // Проверяем форму на ошибки
    if (!validateForm()) {
      return;
    }
    
    // Сбрасываем статусы и ошибки
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      // Подготавливаем данные для отправки
      const userData = {
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
        role: formData.role,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined
      };
      
      // Отправляем запрос через контекст
      const result = await createUser(userData);
      
      if (result.success) {
        // Очищаем форму при успешном создании
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          role: 'user',
          first_name: '',
          last_name: ''
        });
        setValidated(false);
        setSuccess(`Пользователь ${result.user.username} успешно создан`);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Ошибка при создании пользователя: ' + (error.message || 'Неизвестная ошибка'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="user-form-container">
      <h3 className="mb-4">Добавление нового пользователя</h3>
      
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
      
      <Card className="mb-4">
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Имя пользователя*
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    minLength={3}
                    placeholder="Введите имя пользователя"
                  />
                  <Form.Control.Feedback type="invalid">
                    Имя пользователя обязательно и должно содержать не менее 3 символов
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Введите email"
                  />
                  <Form.Control.Feedback type="invalid">
                    Введите корректный email
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faKey} className="me-2" />
                    Пароль*
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="Введите пароль"
                  />
                  <Form.Control.Feedback type="invalid">
                    Пароль обязателен и должен содержать не менее 8 символов
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faKey} className="me-2" />
                    Подтверждение пароля*
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Повторите пароль"
                    isInvalid={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                  />
                  <Form.Control.Feedback type="invalid">
                    Пароли не совпадают
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faIdCard} className="me-2" />
                    Роль пользователя
                  </Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="user">Пользователь</option>
                    <option value="admin">Администратор</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Имя</Form.Label>
                  <Form.Control
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Введите имя"
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Фамилия</Form.Label>
                  <Form.Control
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Введите фамилию"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <div className="d-flex justify-content-end mt-3">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={isLoading}
                className="d-flex align-items-center"
              >
                <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                {isLoading ? 'Создание...' : 'Создать пользователя'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header>Справка</Card.Header>
        <Card.Body>
          <h5>Требования к пользователям</h5>
          <ul>
            <li>Имя пользователя: не менее 3 символов, должно быть уникальным</li>
            <li>Пароль: не менее 8 символов</li>
            <li>Email: необязательное поле, должно быть в корректном формате</li>
          </ul>
          <h5>Роли пользователей</h5>
          <ul>
            <li><strong>Пользователь</strong> - стандартная роль с базовыми правами доступа</li>
            <li><strong>Администратор</strong> - расширенные права доступа, включая административную панель</li>
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

export default UserForm; 