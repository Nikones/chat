import React, { useEffect, useState, Suspense, useCallback, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import axios from 'axios';

// Контексты
import { useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';

// Компоненты страниц
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Layout from './components/layout/Layout';
import Chat from './components/Chat/Chat';
import AdminPanel from './components/Admin/AdminPanel';
import Profile from './components/profile/Profile';
import Settings from './components/settings/Settings';
import NotFound from './components/common/NotFound';

// Упрощенные защищенные маршруты
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Защищенные маршруты для администратора
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Обертка для публичных маршрутов
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }
  
  return !isAuthenticated ? children : <Navigate to="/" />;
};

// Главный компонент приложения
const App = () => {
  const { checkSession, loading } = useAuth();
  
  // Проверяем аутентификацию при загрузке
  useEffect(() => {
    console.log('App: Запуск проверки сессии');
    checkSession();
  }, [checkSession]);
  
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </Container>
    );
  }
  
  return (
    <Routes>
      {/* Публичные маршруты */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      
      {/* Защищенные маршруты внутри Layout */}
      <Route path="/" element={
        <PrivateRoute>
          <AdminProvider>
            <Layout />
          </AdminProvider>
        </PrivateRoute>
      }>
        <Route index element={<Chat />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
