import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

// Базовый URL для API
const API_URL = '/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      
      // Используем прямой XMLHttpRequest для максимального контроля
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/login`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.responseType = 'text';
      
      xhr.onload = function() {
        console.log(`Login: Получен ответ, статус: ${xhr.status}`);
        
        if (xhr.status === 200) {
          try {
            // Вывод полного содержимого ответа для отладки
            console.log('Login: Полный ответ от сервера:', xhr.responseText);
            
            // Парсим JSON-ответ
            const response = JSON.parse(xhr.responseText);
            console.log('Login: Ответ успешно распарсен, содержит поля:', Object.keys(response));
            
            if (response.token) {
              console.log('Login: Токен найден в ответе, длина:', response.token.length);
              
              // Сохраняем токен в localStorage
              try {
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('token', response.token);
                console.log('Login: Токен сохранен в localStorage');
                
                // Проверяем, что токен сохранился
                const savedToken = localStorage.getItem('token');
                if (savedToken) {
                  console.log('Login: Токен успешно сохранен, первые 10 символов:', savedToken.substring(0, 10));
                  
                  if (response.user) {
                    localStorage.setItem('user_data', JSON.stringify(response.user));
                    console.log('Login: Данные пользователя сохранены:', response.user.username);
                  }
                  
                  // Устанавливаем заголовок авторизации для будущих запросов
                  axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
                  
                  // Выводим сообщение о перенаправлении
                  console.log('Login: Выполняем перенаправление на главную страницу...');
                  
                  // Жестко перенаправляем на домашнюю страницу
                  window.location.href = '/';
                } else {
                  console.error('Login: Ошибка сохранения токена в localStorage');
                  setError('Не удалось сохранить токен авторизации');
                  setLoading(false);
                }
              } catch (storageError) {
                console.error('Login: Ошибка при работе с localStorage:', storageError);
                setError('Ошибка при работе с localStorage: ' + storageError.message);
                setLoading(false);
              }
            } else {
              console.error('Login: В ответе нет токена:', response);
              setError('Сервер вернул неверный формат ответа');
              setLoading(false);
            }
          } catch (parseError) {
            console.error('Login: Ошибка разбора JSON:', parseError, 'Текст ответа:', xhr.responseText);
            setError('Ошибка при разборе ответа сервера');
            setLoading(false);
          }
        } else {
          console.error('Login: Сервер вернул ошибку:', xhr.status, xhr.statusText);
          setError(`Ошибка сервера: ${xhr.status} ${xhr.statusText}`);
          setLoading(false);
        }
      };
      
      xhr.onerror = function() {
        console.error('Login: Сетевая ошибка при запросе');
        setError('Ошибка сети при выполнении запроса');
        setLoading(false);
      };
      
      xhr.ontimeout = function() {
        console.error('Login: Таймаут запроса');
        setError('Превышено время ожидания ответа от сервера');
        setLoading(false);
      };
      
      // Отправляем запрос
      const data = JSON.stringify({ username, password });
      console.log('Login: Отправка данных:', { username, password: '*****' });
      xhr.send(data);
      
    } catch (err) {
      console.error('Login: Необработанная ошибка:', err);
      setError('Произошла неизвестная ошибка');
      setLoading(false);
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
