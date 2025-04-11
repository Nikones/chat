import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { checkSystemInitialization } from '../../api/apiInstance';

// Базовый URL для API
const API_URL = '/api';

const Setup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [systemInitialized, setSystemInitialized] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Проверка статуса инициализации при загрузке компонента
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        console.log('Setup: Проверка статуса инициализации системы');
        
        // Используем новую функцию для проверки статуса
        const { initialized, error } = await checkSystemInitialization();
        console.log('Setup: Результат проверки:', { initialized, error });
        
        if (initialized) {
          console.log('Setup: Система уже инициализирована, перенаправляем на /login');
          setSystemInitialized(true);
          
          // Небольшая задержка перед редиректом
          setTimeout(() => {
            navigate('/login');
          }, 500);
        } else {
          console.log('Setup: Система требует инициализации');
          setSystemInitialized(false);
        }
      } catch (error) {
        console.error('Setup: Ошибка при проверке статуса инициализации:', error);
        
        // При ошибке считаем систему неинициализированной и позволяем пользователю пройти настройку
        setSystemInitialized(false);
      } finally {
        setCheckingStatus(false);
      }
    };
    
    checkInitialization();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password || !confirmPassword) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    if (username.length < 3) {
      setError('Имя пользователя должно содержать не менее 3 символов');
      return;
    }
    
    if (password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess(false);
      
      console.log('Setup: Отправка запроса на настройку системы...');
      
      // Исправленный формат запроса - используем admin_username и admin_password
      const setupData = {
        admin_username: username,
        admin_password: password
      };
      
      console.log('Setup: Данные для настройки:', { admin_username: username, admin_password: '***' });
      console.log('Setup: URL запроса:', `${API_URL}/system/setup`);
      
      // Отправляем запрос на настройку системы
      const response = await axios.post(`${API_URL}/system/setup`, setupData);
      
      console.log('Setup: Ответ от сервера:', response.status, response.statusText);
      
      if (response.data) {
        console.log('Setup: Данные получены:', Object.keys(response.data));
        
        if (response.data.token && response.data.user) {
          console.log('Setup: Токен и информация о пользователе получены, выполняем вход');
          
          // Устанавливаем успех настройки
          setSuccess(true);
          
          // Выполняем прямой вход с полученным токеном
          await login(response.data.token, response.data.user);
          
          // Небольшая задержка перед редиректом
          setTimeout(() => {
            console.log('Setup: Перенаправление на главную страницу');
            navigate('/');
          }, 1500);
        } else {
          setError('Система настроена, но данные для входа отсутствуют');
          
          // Перенаправляем на страницу входа
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        console.error('Setup: Пустой ответ от сервера');
        setError('Сервер вернул пустой ответ');
      }
    } catch (err) {
      console.error('Setup: Ошибка при настройке системы:', err);
      
      if (err.response) {
        console.error('Setup: Детали ответа:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
        
        if (err.response.data && err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError(`Ошибка сервера: ${err.response.status} ${err.response.statusText}`);
        }
      } else if (err.request) {
        console.error('Setup: Запрос отправлен, но ответа нет:', err.request);
        setError('Сервер не отвечает. Проверьте подключение к интернету.');
      } else {
        console.error('Setup: Ошибка настройки запроса:', err.message);
        setError(`Ошибка: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Показываем индикатор загрузки при проверке статуса
  if (checkingStatus) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Проверка статуса системы...</p>
      </Container>
    );
  }
  
  // Если система уже настроена, показываем сообщение и кнопку перехода на страницу логина
  if (systemInitialized) {
    return (
      <Container className="py-5 text-center">
        <Card className="shadow-lg border-0">
          <Card.Header className="bg-success text-white text-center py-3">
            <h3>Система инициализирована</h3>
          </Card.Header>
          <Card.Body className="p-4">
            <p>Система уже настроена. Перенаправление на страницу входа...</p>
            <Spinner animation="border" variant="primary" className="mt-3" />
            <div className="mt-4">
              <Button variant="primary" onClick={() => navigate('/login')}>
                Перейти к входу
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-primary text-white text-center py-4">
              <h3>Мессенджер Кикиты</h3>
              <p className="mb-0">Создайте учетную запись администратора</p>
            </Card.Header>
            <Card.Body className="p-4">
              <p className="text-center mb-4">
                Это чатик kikita.ru, так что просто так сюда не попадешь!
              </p>
              
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}
              
              {success && (
                <Alert variant="success">
                  Админ создан успешно! Перенаправление...
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Имя пользователя</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Введите имя администратора"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading || success}
                    required
                    autoFocus
                  />
                  <Form.Text className="text-muted">
                    Минимум 3 символа
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Пароль</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || success}
                    required
                  />
                  <Form.Text className="text-muted">
                    Минимум 8 символов
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Подтверждение пароля</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading || success}
                    required
                  />
                </Form.Group>
                
                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={loading || success}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                        />
                        <span className="ms-2">Настройка...</span>
                      </>
                    ) : success ? (
                      "Готово!"
                    ) : (
                      "Создать администратора"
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
            <Card.Footer className="text-center p-3">
              <small className="text-muted">© {new Date().getFullYear()} Kikita.ru - Все права защищены</small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Setup;
