import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import API from '../utils/api';

// Создаем контекст с дефолтными значениями чтобы избежать null
const AdminContext = createContext({
  users: [],
  settings: {
    registrationEnabled: false,
    maxUploadSize: 10,
    messageRetentionDays: 30,
    callTimeout: 60,
    maxGroupSize: 20
  },
  loading: true,
  error: null,
  loadUsers: () => {},
  createUser: () => {},
  updateUser: () => {},
  deleteUser: () => {},
  toggleRegistration: () => {},
  updateSettings: () => {},
  getStats: () => {},
});

export const AdminProvider = ({ children }) => {
  const auth = useAuth();
  // Безопасно извлекаем свойства из контекста авторизации
  const token = auth?.token || '';
  const isAuthenticated = auth?.isAuthenticated || false;
  
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    registrationEnabled: false,
    maxUploadSize: 10,
    messageRetentionDays: 30,
    callTimeout: 60,
    maxGroupSize: 20
  });
  const [loading, setLoading] = useState({ users: true, settings: true });
  const [error, setError] = useState(null);
  const [apiError, setApiError] = useState({ users: null, settings: null });

  // Функция для загрузки настроек системы
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    const defaultSettings = {
      registrationEnabled: false,
      maxUploadSize: 10,
      messageRetentionDays: 30,
      callTimeout: 60,
      maxGroupSize: 20,
      // Добавляем поля, которые приходят от API, если они нужны в UI
      maintenance_mode: false, 
      app_name: 'Мессенджер',
      app_version: '0.0.0'
    };

    try {
      console.log('Admin: Загрузка настроек системы');
      setLoading(prev => ({ ...prev, settings: true })); 
      setApiError(prev => ({ ...prev, settings: null }));

      const response = await API.get('/admin/settings');
      console.log('[AdminContext] Raw settings response data:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        // Объединяем дефолтные настройки с полученными данными
        const mergedSettings = { 
            ...defaultSettings, 
            ...response.data, 
            // Явно преобразуем registration_enabled в registrationEnabled, если имена отличаются
            registrationEnabled: response.data.registration_enabled 
        };
        setSettings(mergedSettings);
        return mergedSettings;
      } else {
        console.warn('Admin: Сервер вернул некорректные данные настроек, используем дефолтные значения');
        setSettings(defaultSettings);
        setApiError(prev => ({ ...prev, settings: 'Некорректный формат данных настроек от сервера' }));
        return defaultSettings;
      }
    } catch (error) {
      console.error('Admin: Ошибка загрузки настроек:', error);
      setApiError(prev => ({ ...prev, settings: 'Ошибка загрузки настроек. ' + (error.response?.data?.message || error.message) }));
      setSettings(defaultSettings); // Устанавливаем дефолт при ошибке
      toast.error('Ошибка загрузки настроек администратора');
      return defaultSettings;
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
    }
  }, [isAuthenticated, API]);

  // Функция для обновления настроек
  const updateSettings = useCallback(async (newSettings) => {
    if (!isAuthenticated) return false;
    
    setLoading(true);
    try {
      const response = await axios.put('/api/admin/settings', newSettings, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.settings) {
        setSettings(response.data.settings);
        toast.success('Настройки обновлены');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin: Ошибка при обновлении настроек', err);
      setError(err.message || 'Ошибка при обновлении настроек');
      toast.error('Не удалось обновить настройки системы');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  // Функция для переключения регистрации
  const toggleRegistration = useCallback(async (value) => {
    // Обновляем локальное состояние для немедленного отражения в UI
    setSettings(prev => ({
      ...prev,
      registrationEnabled: value
    }));
    return await updateSettings({ registrationEnabled: value });
  }, [updateSettings]);

  // Функция для получения статистики
  const getStats = useCallback(async () => {
    if (!isAuthenticated) return null;
    
    try {
      const response = await axios.get('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Admin: Ошибка при получении статистики', err);
      toast.error('Не удалось получить статистику');
      return null;
    }
  }, [token, isAuthenticated]);

  // Функция для загрузки списка пользователей
  const loadUsers = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('Admin: Попытка загрузить пользователей без аутентификации');
      return;
    }
    
    // Устанавливаем loading для пользователей
    setLoading(prev => ({ ...prev, users: true }));
    // Сбрасываем ошибку пользователей
    setApiError(prev => ({ ...prev, users: null }));
    
    try {
      console.log('Admin: Загрузка списка пользователей');
      // Используем API для консистентности
      const response = await API.get('/admin/users');
      
      // Проверяем ответ сервера
      if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
        console.log(`Admin: Загружено ${response.data.users.length} пользователей`);
      } else {
        setUsers([]);
        console.warn('Admin: Сервер вернул некорректные данные пользователей', response.data);
        setApiError(prev => ({ ...prev, users: 'Некорректные данные пользователей' }));
      }
    } catch (err) {
      console.error('Admin: Ошибка при загрузке пользователей', err);
      // Устанавливаем ошибку для пользователей
      setApiError(prev => ({ ...prev, users: err.message || 'Ошибка при загрузке списка пользователей' }));
      setUsers([]);
      toast.error('Не удалось загрузить список пользователей');
    } finally {
      // Сбрасываем loading для пользователей
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [isAuthenticated, API]); // Убираем token, используем API

  // Функция для создания нового пользователя
  const createUser = useCallback(async (userData) => {
    if (!isAuthenticated) return false;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/admin/users', userData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Добавляем нового пользователя в состояние
      if (response.data && response.data.user) {
        setUsers(prev => [...prev, response.data.user]);
        toast.success('Пользователь успешно создан');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin: Ошибка при создании пользователя', err);
      setError(err.message || 'Ошибка при создании пользователя');
      toast.error('Не удалось создать пользователя');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  // Функция для обновления данных пользователя
  const updateUser = useCallback(async (userId, userData) => {
    if (!isAuthenticated) return false;
    
    setLoading(prev => ({...prev, users: true})); // Используем объектный loading
    setApiError(prev => ({ ...prev, users: null }));
    try {
      // Исправляем URL: убираем /admin
      const response = await API.put(`/users/${userId}`, userData); 
      
      if (response.data && response.data.user) {
        setUsers(prev => 
          prev.map(user => user.id === userId ? response.data.user : user)
        );
        toast.success('Данные пользователя обновлены');
        return true;
      } else {
         console.warn("Update user response did not contain user data:", response.data);
         setApiError(prev => ({ ...prev, users: 'Некорректный ответ сервера при обновлении пользователя' }));
         return false;
      }
    } catch (err) {
      console.error('Admin: Ошибка при обновлении пользователя', err);
      setApiError(prev => ({ ...prev, users: err.response?.data?.message || err.message || 'Ошибка при обновлении пользователя' })); 
      toast.error('Не удалось обновить данные пользователя');
      return false;
    } finally {
      setLoading(prev => ({...prev, users: false})); // Используем объектный loading
    }
  }, [isAuthenticated, API, setApiError]); // Добавляем API

  // Функция для удаления пользователя
  const deleteUser = useCallback(async (userId) => {
    if (!isAuthenticated) return false;
    
    setLoading(true);
    try {
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Удаляем пользователя из состояния
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('Пользователь удален');
      return true;
    } catch (err) {
      console.error('Admin: Ошибка при удалении пользователя', err);
      setError(err.message || 'Ошибка при удалении пользователя');
      toast.error('Не удалось удалить пользователя');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  // Функция для блокировки/разблокировки пользователя
  const toggleUserBlock = useCallback(async (userId, blocked) => {
    if (!isAuthenticated) return false;
    
    setLoading(true);
    try {
      const response = await axios.put(`/api/admin/users/${userId}/block`, { blocked }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Обновляем пользователя в состоянии
      if (response.data && response.data.user) {
        setUsers(prev => 
          prev.map(user => user.id === userId ? response.data.user : user)
        );
        toast.success(blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin: Ошибка при блокировке/разблокировке пользователя', err);
      setError(err.message || 'Ошибка при изменении статуса пользователя');
      toast.error('Не удалось изменить статус пользователя');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  // Эффект для загрузки пользователей и настроек при монтировании компонента
  useEffect(() => {
    if (isAuthenticated) {
      console.log('AdminContext: Инициализация и загрузка данных');
      // Устанавливаем начальное состояние загрузки при аутентификации
      setLoading({ users: true, settings: true });
      loadUsers();
      fetchSettings();
    } else {
      console.log('AdminContext: Ожидание аутентификации');
      setUsers([]);
      // Сбрасываем loading, если не аутентифицирован
      setLoading({ users: false, settings: false });
    }
  }, [isAuthenticated, loadUsers, fetchSettings]);

  // Создаем значение контекста
  const contextValue = {
    users,
    settings,
    loading,
    apiError,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserBlock,
    toggleRegistration,
    updateSettings,
    getStats,
    fetchSettings,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};

// Хук для использования AdminContext
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    console.error('useAdmin должен использоваться внутри AdminProvider');
  }
  return context;
};

export default AdminContext; 