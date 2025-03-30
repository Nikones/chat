import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Alert,
  CircularProgress
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Setup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
      
      // Отправляем запрос на настройку системы на прямой IP-адрес сервера
      const response = await axios.post('http://10.16.52.11:8080/api/system/setup', {
        admin_username: username,
        admin_password: password
      });
      
      // Сохраняем токен в localStorage напрямую
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Устанавливаем глобальное состояние через login без повторного запроса
      await login(null, null, response.data.token, response.data.user);
      
      navigate('/');
    } catch (err) {
      console.error('Ошибка при настройке системы:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Произошла ошибка при настройке системы');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <Avatar sx={{ m: 1, bgcolor: 'success.main' }}>
            <PersonAddIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Первоначальная настройка
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3, textAlign: 'center' }}>
            Создайте учетную запись администратора для доступа к системе
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Имя пользователя администратора"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Подтвердите пароль"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Создать администратора'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Setup;
