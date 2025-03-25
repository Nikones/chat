import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Компонент для защиты приватных маршрутов
 * Если пользователь не авторизован, перенаправляем на страницу входа
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Пока проверяется авторизация, показываем загрузку
  if (loading) {
    return <div>Загрузка...</div>;
  }

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Если пользователь авторизован, рендерим содержимое
  return children;
};

export default PrivateRoute;
