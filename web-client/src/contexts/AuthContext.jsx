import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import wsService from '../utils/websocket'; // Импортируем WebSocket сервис

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
    console.log('AuthContext: Попытка получения токена из localStorage');
    
    // Пробуем разные ключи для совместимости с разными версиями
    const authToken = localStorage.getItem('auth_token');
    const token = localStorage.getItem('token');
    
    console.log('AuthContext: auth_token в localStorage:', authToken ? 'присутствует' : 'отсутствует');
    console.log('AuthContext: token в localStorage:', token ? 'присутствует' : 'отсутствует');
    
    // Возвращаем токен, если он есть
    return authToken || token || null;
  }, []);
  
  // Сохранение данных аутентификации
  const saveAuthData = useCallback((token, userData) => {
    try {
      console.log('AuthContext: Сохранение токена непосредственно в localStorage');
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      
      // Сохраняем данные пользователя
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      // Устанавливаем заголовок Authorization для всех последующих запросов axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('AuthContext: Установлен заголовок авторизации для Axios');
      
      // Проверяем, что токен сохранен
      const savedToken = localStorage.getItem('auth_token');
      console.log('AuthContext: Проверка сохраненного токена:', 
                  savedToken ? (savedToken.substring(0, 10) + '...') : 'не сохранен');
      
      return !!savedToken;
    } catch (e) {
      console.error('AuthContext: Ошибка при сохранении данных аутентификации:', e);
      return false;
    }
  }, []);
  
  // Очистка данных аутентификации
  const clearAuthData = useCallback(() => {
    console.log('AuthContext: Очистка данных аутентификации');
    
    try {
      // Удаляем все связанные с аутентификацией данные
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user_data');
      
      // Удаляем заголовок авторизации
      delete axios.defaults.headers.common['Authorization'];
      
      return true;
    } catch (e) {
      console.error('AuthContext: Ошибка при очистке данных аутентификации:', e);
      return false;
    }
  }, []);
  
  // Проверка актуальности сессии
  const checkSession = useCallback(async () => {
    console.log('AuthContext: Проверка текущей сессии');
    
    // Получаем токен
    const token = getToken();
    
    if (!token) {
      console.log('AuthContext: Токен не найден, сессия неактивна');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }
    
    // Устанавливаем заголовок авторизации
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('AuthContext: Установлен заголовок Authorization для запросов');
    
    try {
      // Отправляем запрос на проверку сессии
      console.log('AuthContext: Отправка запроса на проверку сессии');
      const response = await axios.get(`${API_URL}/auth/check`);
      
      if (response.status === 200 && response.data && response.data.user) {
        console.log('AuthContext: Сессия активна, пользователь:', response.data.user.username);
        setUser(response.data.user);
        setIsAuthenticated(true);
        setAdmin(response.data.user.role === 'admin');
        
        // Обновляем данные пользователя в localStorage
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        // Инициализация WebSocket, если токен актуален
        wsService.init(token);
        
        setLoading(false);
        return true;
      } else {
        console.log('AuthContext: Ответ сервера некорректен, выход из системы');
        clearAuthData();
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('AuthContext: Ошибка при проверке сессии:', error);
      
      // При ошибке очищаем данные и выходим из системы
      clearAuthData();
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }
  }, [getToken, clearAuthData]);
  
  // Вход в систему
  const login = async (token, userData) => {
    console.log('AuthContext: Вход в систему');
    setLoading(true);
    setError(null);
    
    try {
      // Токен и данные пользователя уже должны быть в localStorage (сохранены в компоненте Login)
      // Проверим это и установим заголовок авторизации
      const savedToken = getToken();
      if (!savedToken) {
        console.log('AuthContext: Токен не найден в localStorage, пробуем сохранить снова');
        if (!saveAuthData(token, userData)) {
          console.error('AuthContext: Не удалось сохранить токен');
          setError('Ошибка сохранения токена');
          return false;
        }
      }
      
      // Устанавливаем состояние аутентификации
      setIsAuthenticated(true);
      setUser(userData);
      setAdmin(userData.role === 'admin');
      
      console.log('AuthContext: Пользователь успешно аутентифицирован');
      console.log('AuthContext: isAuthenticated установлен в:', true);
      console.log('AuthContext: user установлен в:', userData);
      
      // Инициализируем WebSocket соединение с токеном
      console.log('AuthContext: Инициализация WebSocket');
      wsService.init(token);
      
      return true;
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
      const token = getToken();
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        try {
          // Устанавливаем токен для запросов
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Добавляем диагностическую проверку токена в заголовке
          console.log('AuthContext: Токен установлен в заголовок Authorization:', 
                      !!axios.defaults.headers.common['Authorization']);
          
          // Парсим данные пользователя
          const parsedUser = JSON.parse(userData);
          console.log('AuthContext: Данные пользователя из localStorage:', parsedUser);
          
          // Устанавливаем предварительные данные пользователя
          setUser(parsedUser);
          setIsAuthenticated(true);
          setAdmin(parsedUser.role === 'admin');
          
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
        console.log('AuthContext: Результат getToken():', token);
        console.log('AuthContext: localStorage keys:', Object.keys(localStorage));
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, [checkSession, clearAuthData, getToken]);
  
  // Экспортировать токен для использования в других компонентах
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
    admin,
    token: getToken() // Добавляем токен в контекст
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
