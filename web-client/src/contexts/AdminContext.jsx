import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AdminContext = createContext(null);

export const useAdmin = () => useContext(AdminContext);

// Создаем API-клиент с заголовком авторизации
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Добавляем перехватчик для установки токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const AdminProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    registrationEnabled: true,
    maxUploadSize: 10, // MB
    messageRetentionDays: 90,
    callTimeout: 60, // seconds
    maxGroupSize: 25
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Проверка, является ли пользователь администратором
  const isAdmin = useCallback(() => {
    return isAuthenticated && user?.role === 'admin';
  }, [isAuthenticated, user]);
  
  // Загрузка списка пользователей
  const loadUsers = useCallback(async () => {
    if (!isAdmin()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Ошибка загрузки списка пользователей:', err);
      setError('Ошибка загрузки списка пользователей');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Загрузка настроек системы
  const loadSettings = useCallback(async () => {
    if (!isAdmin()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/admin/settings');
      setSettings(response.data);
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
      setError('Ошибка загрузки настроек системы');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Обновление настроек системы
  const updateSettings = useCallback(async (newSettings) => {
    if (!isAdmin()) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      await api.put('/api/admin/settings', newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    } catch (err) {
      console.error('Ошибка обновления настроек:', err);
      setError('Ошибка обновления настроек системы');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Переключение настройки регистрации
  const toggleRegistration = useCallback(async (enabled) => {
    return await updateSettings({ registrationEnabled: enabled });
  }, [updateSettings]);
  
  // Создание нового пользователя
  const createUser = useCallback(async (userData) => {
    if (!isAdmin()) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/admin/users', userData);
      setUsers(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Ошибка создания пользователя:', err);
      setError('Ошибка создания пользователя');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Обновление данных пользователя
  const updateUser = useCallback(async (userId, userData) => {
    if (!isAdmin()) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.put(`/api/admin/users/${userId}`, userData);
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...response.data } : user
      ));
      return response.data;
    } catch (err) {
      console.error('Ошибка обновления пользователя:', err);
      setError('Ошибка обновления пользователя');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Блокировка/разблокировка пользователя
  const toggleUserBlock = useCallback(async (userId, blocked) => {
    if (!isAdmin()) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      const action = blocked ? 'block' : 'unblock';
      await api.post(`/api/admin/users/${userId}/${action}`);
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, blocked } : user
      ));
      
      return true;
    } catch (err) {
      console.error(`Ошибка ${blocked ? 'блокировки' : 'разблокировки'} пользователя:`, err);
      setError(`Ошибка ${blocked ? 'блокировки' : 'разблокировки'} пользователя`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Удаление пользователя
  const deleteUser = useCallback(async (userId) => {
    if (!isAdmin()) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      await api.delete(`/api/admin/users/${userId}`);
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      return true;
    } catch (err) {
      console.error('Ошибка удаления пользователя:', err);
      setError('Ошибка удаления пользователя');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Получение статистики системы
  const getStats = useCallback(async () => {
    if (!isAdmin()) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/admin/stats');
      return response.data;
    } catch (err) {
      console.error('Ошибка получения статистики:', err);
      setError('Ошибка получения статистики системы');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (isAdmin()) {
      loadUsers();
      loadSettings();
    }
  }, [isAdmin, loadUsers, loadSettings]);
  
  const value = {
    users,
    settings,
    loading,
    error,
    isAdmin: isAdmin(),
    loadUsers,
    loadSettings,
    updateSettings,
    toggleRegistration,
    createUser,
    updateUser,
    toggleUserBlock,
    deleteUser,
    getStats
  };
  
  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminProvider; 