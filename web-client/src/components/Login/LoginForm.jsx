import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('LoginForm: Начало процесса входа в систему');
    
    try {
      // Отправляем запрос на авторизацию
      const response = await axios.post('/api/auth/login', {
        username,
        password,
      });

      // Проверяем успешный ответ
      if (response.data && response.data.token) {
        console.log('LoginForm: Получен ответ с токеном от сервера');
        console.log('LoginForm: Длина токена:', response.data.token.length);
        
        // Удаляем тестовый код WebSocket подключения, это будет делать WebSocketContext
        
        // Сохраняем токен только в один ключ localStorage для единообразия
        localStorage.setItem('token', response.data.token);
        
        // Проверяем сохранение токена
        setTimeout(() => {
          const savedToken = localStorage.getItem('token');
          console.log('LoginForm: Проверка сохранения токена:', {
            token: savedToken ? 'сохранен' : 'не сохранен'
          });
        }, 500);
        
        // Сохраняем в контексте авторизации
        await login(response.data.token, response.data.user);
        
        // Отображаем сообщение об успешном входе
        toast.success('Вход выполнен успешно');
        
        // Перенаправляем на страницу чата или другую целевую страницу
        const nextPath = location.state?.from?.pathname || '/';
        navigate(nextPath);
      } else {
        console.error('LoginForm: Ответ не содержит токен', response.data);
        setError('Неверный ответ сервера');
        toast.error('Ошибка входа: неверный ответ сервера');
      }
    } catch (err) {
      console.error('LoginForm: Ошибка входа:', err);
      
      let errorMessage = 'Произошла ошибка при входе';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Неверное имя пользователя или пароль';
        } else if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      }
      
      setError(errorMessage);
      toast.error(`Ошибка входа: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form content */}
    </div>
  );
};

export default LoginForm; 