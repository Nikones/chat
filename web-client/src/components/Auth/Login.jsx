import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Alert
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import axios from 'axios';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
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
      setLoading(true);
      setError('');
      
      console.log('Попытка входа с логином:', username);
      
      // Напрямую вызываем axios для проверки
      const loginUrl = 'http://10.16.52.11:8080/api/login';
      console.log('Отправка запроса на:', loginUrl);
      
      // Используем axios напрямую для логирования 
      const response = await axios.post(loginUrl, {
        username,
        password
      });
      
      console.log('Ответ от сервера:', response.status, response.statusText);
      console.log('Данные ответа:', response.data);
      
      // Вход через контекст авторизации
      await login(username, password);
      navigate('/');
    } catch (err) {
      console.error('Ошибка входа:', err);
      if (err.response) {
        console.error('Детали ответа:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });
        
        setError(err.response.data?.error || 'Произошла ошибка при входе');
      } else if (err.request) {
        console.error('Нет ответа от сервера:', err.request);
        setError('Сервер недоступен. Проверьте подключение к сети');
      } else {
        setError('Произошла ошибка при входе');
      }
    } finally {
      setLoading(false);
    }
  };

  // Если пользователь уже авторизован, перенаправляем на главную
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            padding: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            width: '100%'
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Вход в систему
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Имя пользователя"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Пароль"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Выполняется вход...' : 'Войти'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
