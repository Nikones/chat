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
        
        // Создаем тестовое WebSocket соединение после входа
        const testWebSocketConnection = () => {
          console.log('LoginForm: Тестирование WebSocket соединения после входа');
          
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${response.data.token}`;
          
          console.log('LoginForm: Подключение к', wsUrl.split('?')[0], 'с токеном в URL');
          
          const testWs = new WebSocket(wsUrl);
          
          testWs.onopen = () => {
            console.log('LoginForm: ТЕСТ - WebSocket соединение успешно установлено');
            // Закрываем тестовое соединение через 3 секунды
            setTimeout(() => {
              console.log('LoginForm: ТЕСТ - Закрытие тестового соединения');
              testWs.close(1000, 'Тестовое соединение закрыто');
            }, 3000);
          };
          
          testWs.onclose = (event) => {
            console.log('LoginForm: ТЕСТ - WebSocket соединение закрыто', {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean
            });
          };
          
          testWs.onerror = (error) => {
            console.error('LoginForm: ТЕСТ - Ошибка WebSocket соединения', error);
          };
        };

        // Сохраняем токен в localStorage под несколькими ключами для совместимости
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('token', response.data.token);
        
        // Проверяем сохранение токена
        setTimeout(() => {
          const savedAuthToken = localStorage.getItem('auth_token');
          const savedToken = localStorage.getItem('token');
          console.log('LoginForm: Проверка сохранения токенов:', {
            auth_token: savedAuthToken ? 'сохранен' : 'не сохранен',
            token: savedToken ? 'сохранен' : 'не сохранен'
          });
          
          // Тестируем WebSocket соединение
          testWebSocketConnection();
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