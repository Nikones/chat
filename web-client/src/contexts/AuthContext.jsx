import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // При изменении токена обновляем localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Можно добавить запрос к API для проверки токена
          // const user = await authApi.getCurrentUser();
          // setCurrentUser(user);
          
          // Пока просто устанавливаем пользователя из локального хранилища
          const userData = localStorage.getItem('user');
          if (userData) {
            setCurrentUser(JSON.parse(userData));
          } else {
            logout();
          }
        } catch (error) {
          console.error('Ошибка проверки авторизации:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // Функция входа
  const login = async (username, password, existingToken = null, existingUser = null) => {
    try {
      let token, user;
      
      if (existingToken) {
        // Если уже есть токен (например, после настройки)
        token = existingToken;
        
        // Если пользователь уже предоставлен, используем его
        if (existingUser) {
          user = existingUser;
        } else {
          // Получаем информацию о пользователе
          try {
            const response = await authApi.getCurrentUser(token);
            user = response;
          } catch (error) {
            console.error('Ошибка получения данных о пользователе:', error);
            // Если не удалось получить пользователя, используем данные из localStorage
            const userData = localStorage.getItem('user');
            if (userData) {
              user = JSON.parse(userData);
            } else {
              throw new Error('Не удалось получить данные пользователя');
            }
          }
        }
      } else {
        // Обычный вход
        const loginResponse = await authApi.login(username, password);
        token = loginResponse.token;
        user = loginResponse.user;
      }
      
      setToken(token);
      setCurrentUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Ошибка входа:', error);
      throw error;
    }
  };

  // Функция выхода
  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const value = {
    currentUser,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
