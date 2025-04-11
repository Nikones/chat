import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация формы
    if (password !== confirmPassword) {
      return setError('Пароли не совпадают');
    }
    
    if (password.length < 6) {
      return setError('Пароль должен содержать минимум 6 символов');
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Вызов API для регистрации
      const success = await register({
        username,
        password,
        email,
        display_name: displayName
      });
      
      if (success) {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="auth-container">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="auth-card">
            <Card.Body>
              <h2 className="text-center mb-4">Регистрация</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Имя пользователя</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Введите имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Введите email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="displayName">
                  <Form.Label>Отображаемое имя</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Введите отображаемое имя"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Пароль</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="confirmPassword">
                  <Form.Label>Подтверждение пароля</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mt-3" 
                  disabled={loading}
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
              </Form>
            </Card.Body>
            <Card.Footer className="text-center">
              <div>Уже есть аккаунт? <Link to="/login">Войти</Link></div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register; 