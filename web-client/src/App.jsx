import React, { useEffect, useState, Suspense, useCallback, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import axios from 'axios';

// Контексты
import { useAuth } from './contexts/AuthContext';

// Компоненты страниц
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Layout from './components/layout/Layout';
import Chat from './components/Chat/Chat';
import AdminPanel from './components/Admin/AdminPanel';
import Profile from './components/profile/Profile';
import Settings from './components/settings/Settings';
import NotFound from './components/common/NotFound';

// Защищенные маршруты с проверкой аутентификации
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Защищенные маршруты для администратора
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Обертка для публичных маршрутов
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Обертка над защищенными маршрутами с учетом Layout
const PrivateRouteWrapper = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <Container className="text-center mt-5"><div className="spinner"></div></Container>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Главный компонент приложения
const App = () => {
  const { checkSession, loading, isAuthenticated } = useAuth();
  
  // Проверяем аутентификацию при загрузке
  useEffect(() => {
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
        <PrivateRouteWrapper>
          <Layout />
        </PrivateRouteWrapper>
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
