import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { checkSystemInitialization } from '../../api/apiInstance';

// Базовый URL для API
const API_URL = '/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  // Проверка статуса инициализации при загрузке компонента
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        // Если пользователь уже авторизован, переходим на главную
        if (isAuthenticated) {
          navigate('/');
          return;
        }
        
        // Используем новую функцию для проверки статуса системы
        const { initialized, error } = await checkSystemInitialization();
        
        if (!initialized) {
          // Система не инициализирована, перенаправляем на страницу настройки
          console.log('Login: Система не инициализирована, перенаправляем на /setup');
          navigate('/setup');
        } else {
          console.log('Login: Система инициализирована, остаемся на странице входа');
        }
      } catch (error) {
        console.error('Login: Ошибка при проверке статуса инициализации:', error);
        // При ошибке остаемся на странице входа
      } finally {
        setCheckingStatus(false);
      }
    };
    
    checkInitialization();
  }, [navigate, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      console.log('Login: Отправка запроса на вход...');
      console.log(`Login: URL для входа: ${API_URL}/login`);
      
      const response = await axios.post(`${API_URL}/login`, {
        username, 
        password
      });
      
      console.log('Login: Успешный ответ:', response.status, response.statusText);
      
      if (response.data && response.data.token) {
        // Успешный вход
        await login(response.data.token, response.data.user);
        navigate('/');
      } else {
        console.error('Login: Неверный формат ответа:', response.data);
        setError('Неверный формат ответа от сервера');
      }
    } catch (err) {
      console.error('Login: Ошибка входа:', err);
      
      // Детальная информация об ошибке для отладки
      if (err.response) {
        console.error('Login: Детали ошибки:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
        
        if (err.response.data && err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError(`Ошибка входа: ${err.response.status} ${err.response.statusText}`);
        }
      } else if (err.request) {
        console.error('Login: Запрос отправлен, но ответа нет:', err.request);
        setError('Сервер не отвечает. Проверьте подключение к интернету.');
      } else {
        console.error('Login: Ошибка настройки запроса:', err.message);
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

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-primary text-white text-center py-4">
              <h3>Мессенджер Кикиты</h3>
              <p className="mb-0">Вход в систему</p>
            </Card.Header>
            <Card.Body className="p-4">
              <p className="text-center mb-4">
                Это чатик kikita.ru, так что просто так сюда не попадешь!
              </p>
              
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Имя пользователя</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Введите имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                    autoFocus
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Пароль</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </Form.Group>
                
                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={loading}
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
                        <span className="ms-2">Вход...</span>
                      </>
                    ) : (
                      'Войти'
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

export default Login;
