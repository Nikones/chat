import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

// Базовый URL для API
const API_URL = '/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  // Реф для отслеживания, смонтирован ли компонент
  const mountedRef = useRef(true);
  
  // Устанавливаем флаг при размонтировании
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Перенаправление на главную, если пользователь авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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
      
      // Проверяем, смонтирован ли еще компонент перед обновлением состояния
      if (!mountedRef.current) return;
      
      console.log('Login: Успешный ответ:', response.status, response.statusText);
      
      if (response.data && response.data.token) {
        // Успешный вход
        await login(response.data.token, response.data.user);
        
        // Проверяем, смонтирован ли еще компонент перед навигацией
        if (!mountedRef.current) return;
        
        navigate('/');
      } else {
        console.error('Login: Неверный формат ответа:', response.data);
        if (mountedRef.current) {
          setError('Неверный формат ответа от сервера');
        }
      }
    } catch (err) {
      console.error('Login: Ошибка входа:', err);
      
      // Проверяем, смонтирован ли еще компонент перед обновлением состояния
      if (!mountedRef.current) return;
      
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
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

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
                
                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
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
                          className="me-2"
                        />
                        Вход...
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
