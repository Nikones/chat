import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Компонент для защиты приватных маршрутов
 * Если пользователь не авторизован, перенаправляем на страницу входа
 * Если требуется роль администратора и пользователь не администратор, перенаправляем на главную страницу
 */
const PrivateRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, loading, currentUser } = useAuth();

  // Пока проверяется авторизация, показываем загрузку
  if (loading) {
    return <div>Загрузка...</div>;
  }

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Если требуется роль администратора, проверяем права доступа
  if (requireAdmin && currentUser?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  // Если все проверки пройдены, рендерим содержимое
  return children;
};

export default PrivateRoute;
