import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Функция для загрузки настроек системы
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      console.log('Admin: Загрузка настроек системы');
      const response = await axios.get('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.settings) {
        setSettings(response.data.settings);
        console.log('Admin: Настройки системы загружены успешно');
      } else {
        console.warn('Admin: Сервер вернул некорректные данные настроек, используем дефолтные значения');
      }
    } catch (err) {
      console.error('Admin: Ошибка при загрузке настроек системы', err);
      toast.error('Не удалось загрузить настройки системы');
      // В случае ошибки оставляем дефолтные настройки
    }
  }, [token, isAuthenticated]);

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
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Admin: Загрузка списка пользователей');
      const response = await axios.get('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
        console.log(`Admin: Загружено ${response.data.users.length} пользователей`);
      } else {
        // В случае если сервер не вернул массив, создаем пустой массив
        setUsers([]);
        console.warn('Admin: Сервер вернул некорректные данные пользователей', response.data);
      }
    } catch (err) {
      console.error('Admin: Ошибка при загрузке пользователей', err);
      setError(err.message || 'Ошибка при загрузке списка пользователей');
      // В случае ошибки устанавливаем пустой массив вместо null
      setUsers([]);
      toast.error('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

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
    
    setLoading(true);
    try {
      const response = await axios.put(`/api/admin/users/${userId}`, userData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Обновляем пользователя в состоянии
      if (response.data && response.data.user) {
        setUsers(prev => 
          prev.map(user => user.id === userId ? response.data.user : user)
        );
        toast.success('Данные пользователя обновлены');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin: Ошибка при обновлении пользователя', err);
      setError(err.message || 'Ошибка при обновлении пользователя');
      toast.error('Не удалось обновить данные пользователя');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

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
      loadUsers();
      fetchSettings();
    } else {
      console.log('AdminContext: Ожидание аутентификации');
      // Устанавливаем пустой массив вместо null
      setUsers([]);
    }
  }, [isAuthenticated, loadUsers, fetchSettings]);

  // Создаем значение контекста
  const contextValue = {
    users,
    settings,
    loading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserBlock,
    toggleRegistration,
    updateSettings,
    getStats,
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