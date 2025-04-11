import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Состояние аутентификации
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [admin, setAdmin] = useState(false);
  
  // Базовый URL для API
  const API_URL = '/api';
  
  // Получение токена из localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('auth_token');
  }, []);
  
  // Сохранение токена и данных пользователя
  const saveAuthData = useCallback((token, userData) => {
    if (token) {
      console.log('AuthContext: Сохранение токена и данных пользователя');
      localStorage.setItem('auth_token', token);
      
      if (userData) {
        localStorage.setItem('user_data', JSON.stringify(userData));
      }
      
      // Устанавливаем заголовок Authorization для всех последующих запросов axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return true;
    }
    return false;
  }, []);
  
  // Очистка данных аутентификации
  const clearAuthData = useCallback(() => {
    console.log('AuthContext: Очистка данных аутентификации');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    delete axios.defaults.headers.common['Authorization'];
  }, []);
  
  // Проверка валидности текущей сессии
  const checkSession = useCallback(async () => {
    console.log('AuthContext: Проверка текущей сессии');
    setLoading(true);
    
    const token = getToken();
    
    if (!token) {
      console.log('AuthContext: Токен не найден, сессия неактивна');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }
    
    try {
      // Устанавливаем токен для запроса
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Проверяем токен на сервере
      console.log('AuthContext: Запрос на проверку токена');
      const response = await axios.get(`${API_URL}/auth/check`);
      
      if (response.data && response.data.user) {
        console.log('AuthContext: Сессия активна, пользователь:', response.data.user);
        setUser(response.data.user);
        setIsAuthenticated(true);
        setAdmin(response.data.user.role === 'admin');
        setLoading(false);
        return true;
      } else {
        console.log('AuthContext: Ответ сервера не содержит данных пользователя');
        clearAuthData();
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('AuthContext: Ошибка при проверке сессии:', error);
      clearAuthData();
      setIsAuthenticated(false);
      setUser(null);
      setError('Ошибка проверки сессии');
      setLoading(false);
      return false;
    }
  }, [getToken, clearAuthData]);
  
  // Функция для входа пользователя
  const login = async (token, userData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('AuthContext: Обработка входа пользователя');
      
      if (token && userData) {
        console.log('AuthContext: Токен и данные пользователя получены напрямую');
        
        // Сохраняем токен
        localStorage.setItem('auth_token', token);
        
        // Устанавливаем аутентификацию
        setIsAuthenticated(true);
        setUser(userData);
        setAdmin(userData.role === 'admin');
        
        console.log('AuthContext: Пользователь успешно аутентифицирован');
        return true;
      } else {
        console.error('AuthContext: Отсутствуют необходимые данные для входа');
        setError('Отсутствуют необходимые данные для входа');
        return false;
      }
    } catch (err) {
      console.error('AuthContext: Ошибка входа:', err);
      setError(err.message || 'Произошла ошибка при входе');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Выход из системы
  const logout = useCallback(async () => {
    console.log('AuthContext: Выход из системы');
    setLoading(true);
    
    try {
      // Отправляем запрос на выход (если требуется на сервере)
      const token = getToken();
      
      if (token) {
        console.log('AuthContext: Отправка запроса на выход');
        await axios.post(`${API_URL}/auth/logout`);
      }
    } catch (error) {
      console.error('AuthContext: Ошибка при выходе:', error);
      // Ошибку при выходе игнорируем, так как все равно очищаем данные
    } finally {
      // Очищаем данные независимо от результата запроса
      clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, [getToken, clearAuthData]);
  
  // Регистрация нового пользователя
  const register = useCallback(async (username, password, email) => {
    console.log(`AuthContext: Регистрация нового пользователя ${username}`);
    setLoading(true);
    setError(null);
    
    try {
      // Отправляем запрос на регистрацию
      console.log('AuthContext: Отправка запроса на регистрацию');
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        password,
        email
      });
      
      // Проверяем ответ
      if (response.data && response.data.token) {
        console.log('AuthContext: Регистрация успешна, получен токен');
        
        // Сохраняем токен и данные пользователя
        saveAuthData(response.data.token, response.data.user);
        
        // Обновляем состояние
        setUser(response.data.user);
        setIsAuthenticated(true);
        setAdmin(response.data.user.role === 'admin');
        setLoading(false);
        return true;
      } else {
        console.error('AuthContext: Ответ не содержит токен');
        setError('Ошибка регистрации');
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('AuthContext: Ошибка регистрации:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Произошла ошибка при регистрации');
      }
      
      setLoading(false);
      return false;
    }
  }, [saveAuthData]);
  
  // Обновление данных пользователя
  const updateUserData = useCallback(async (userData) => {
    if (!isAuthenticated) {
      return false;
    }
    
    console.log('AuthContext: Обновление данных пользователя');
    setLoading(true);
    
    try {
      // Отправляем запрос на обновление
      const response = await axios.put(`${API_URL}/users/profile`, userData);
      
      if (response.data && response.data.user) {
        console.log('AuthContext: Данные пользователя обновлены');
        
        // Обновляем в localStorage
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        // Обновляем состояние
        setUser(response.data.user);
        setAdmin(response.data.user.role === 'admin');
        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('AuthContext: Ошибка обновления профиля:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Произошла ошибка при обновлении профиля');
      }
      
      setLoading(false);
      return false;
    }
  }, [isAuthenticated]);
  
  // Проверка сессии при загрузке компонента
  useEffect(() => {
    console.log('AuthContext: Инициализация');
    
    const initializeAuth = async () => {
      // Пытаемся загрузить пользователя из localStorage
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        try {
          // Устанавливаем токен для запросов
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Парсим данные пользователя
          const parsedUser = JSON.parse(userData);
          console.log('AuthContext: Данные пользователя из localStorage:', parsedUser);
          
          // Проверяем валидность сессии
          await checkSession();
        } catch (error) {
          console.error('AuthContext: Ошибка инициализации:', error);
          clearAuthData();
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
        }
      } else {
        // Нет сохраненной сессии
        console.log('AuthContext: Нет сохраненного токена');
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, [checkSession, clearAuthData]);
  
  // Значение контекста
  const contextValue = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    register,
    checkSession,
    updateUserData,
    admin
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
