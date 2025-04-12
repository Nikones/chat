import React, { useEffect, useState, Suspense, useCallback, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import axios from 'axios';
import { checkSystemInitialization } from './api/apiInstance';

// Контексты
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import { MessageProvider } from './contexts/MessageContext';
import { CallProvider } from './contexts/CallContext';

// Компоненты страниц
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Setup from './components/Auth/Setup';
import Layout from './components/layout/Layout';
import Chat from './components/Chat/Chat';
import AdminPanel from './components/Admin/AdminPanel';
import Profile from './components/profile/Profile';
import Settings from './components/settings/Settings';
import NotFound from './components/common/NotFound';

// Контекст для состояния системы
const SystemContext = React.createContext(null);

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem должен использоваться внутри SystemProvider');
  }
  return context;
};

// Защищенные маршруты с проверкой аутентификации
const PrivateRouteWrapper = ({ children }) => {
  const { isAuthenticated, loading, checkSession } = useAuth();
  const [checkPerformed, setCheckPerformed] = useState(false);
  
  useEffect(() => {
    const performCheck = async () => {
      if (!isAuthenticated && !loading && !checkPerformed) {
        console.log('PrivateRoute: Проверка сессии');
        await checkSession();
        setCheckPerformed(true);
      }
    };
    
    performCheck();
  }, [isAuthenticated, loading, checkSession, checkPerformed]);
  
  if (loading || (!isAuthenticated && !checkPerformed)) {
    return (
      <div className="loading-screen">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
        <p className="text-muted">Проверка аутентификации...</p>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Компонент для маршрутов администратора
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
        <p className="text-muted">Проверка прав доступа...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Компонент для публичных маршрутов, перенаправляет авторизованных пользователей
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
        <p className="text-muted">Проверка аутентификации...</p>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/" /> : children;
};

// Основной компонент с маршрутизацией
const AppRoutes = () => {
  const location = useLocation();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  
  // Состояние системы
  const [systemState, setSystemState] = useState({
    checked: false,
    initialized: false,
    loading: true,
    error: null
  });
  
  // Функция для проверки статуса системы
  const checkSystemStatus = useCallback(async () => {
    try {
      console.log('App: Проверка статуса инициализации системы...');
      
      // Используем новую функцию checkSystemInitialization
      const result = await checkSystemInitialization();
      console.log('App: Результат проверки статуса:', result);
      
      setSystemState({
        checked: true,
        initialized: result.initialized,
        loading: false,
        error: result.error
      });
      
      return result.initialized;
    } catch (error) {
      console.error('App: Ошибка при проверке статуса системы:', error);
      
      // При любой ошибке считаем систему инициализированной (предотвращаем бесконечные редиректы)
      setSystemState({
        checked: true,
        initialized: true,
        loading: false,
        error: error.message
      });
      
      return true;
    }
  }, []);
  
  // Эффект для проверки статуса системы
  useEffect(() => {
    if (!systemState.checked || systemState.loading) {
      checkSystemStatus();
    }
  }, [checkSystemStatus, systemState.checked, systemState.loading]);
  
  // Показываем индикатор загрузки во время проверки системы
  if (systemState.loading || authLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
        <h3>Мессенджер Кикиты</h3>
        <p className="text-muted">Проверка состояния системы...</p>
      </div>
    );
  }
  
  // Возвращаем базовую конфигурацию маршрутов
  return (
    <SystemContext.Provider value={{ ...systemState, checkStatus: checkSystemStatus }}>
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
        
        {/* Маршрут настройки (доступен только если система не инициализирована) */}
        <Route path="/setup" element={
          systemState.initialized 
            ? <Navigate to="/login" replace />
            : <Setup />
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
    </SystemContext.Provider>
  );
};

// Компонент для проверки WebSocket соединения
const WebSocketWrapper = ({ children }) => {
  const { ready, isConnected, error } = useWebSocket();
  const [waitTime, setWaitTime] = useState(0);
  const { isAuthenticated } = useAuth();
  
  // Не проверяем WebSocket-соединение для неаутентифицированных пользователей
  if (!isAuthenticated) {
    return children;
  }
  
  // Увеличиваем таймер ожидания каждую секунду до 10 секунд
  useEffect(() => {
    if (!ready && !error) {
      const timer = setInterval(() => {
        setWaitTime(prev => {
          if (prev < 10) return prev + 1;
          return prev;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [ready, error]);
  
  // Отображаем детальную информацию о состоянии соединения
  console.log(`WebSocketWrapper: ready=${ready}, isConnected=${isConnected}, error=${error}, waitTime=${waitTime}`);
  
  // Если WebSocket готов или возникла ошибка, или мы ждем слишком долго - рендерим детей
  if (ready || error || waitTime >= 10) {
    if (error) {
      console.warn('WebSocketWrapper: Продолжение с ошибкой WebSocket:', error);
    }
    return children;
  }
  
  // Иначе показываем индикатор загрузки
  return (
    <div className="loading-screen">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Загрузка...</span>
      </div>
      <p className="text-muted">Подключение к серверу сообщений... ({waitTime}с)</p>
    </div>
  );
};

// Компонент с провайдерами
const AppWithProviders = () => {
  return (
    <Suspense fallback={
      <div className="loading-screen">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
        <p className="text-muted">Загрузка приложения...</p>
      </div>
    }>
      <AuthProvider>
        <AdminProvider>
          <WebSocketProvider>
            <MessageProvider>
              <CallProvider>
                <WebSocketWrapper>
                  <AppRoutes />
                </WebSocketWrapper>
              </CallProvider>
            </MessageProvider>
          </WebSocketProvider>
        </AdminProvider>
      </AuthProvider>
    </Suspense>
  );
};

// Корневой компонент с Router
const App = () => {
  return (
    <Router>
      <AppWithProviders />
    </Router>
  );
};

export default App;
