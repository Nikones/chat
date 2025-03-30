import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import axios from 'axios';
import { useAuth } from './contexts/AuthContext';

// Компоненты страниц
import Login from './components/Auth/Login';
import Setup from './components/Auth/Setup';
import ChatLayout from './components/Chat/ChatLayout';
import PrivateRoute from './components/Auth/PrivateRoute';
import AdminPanel from './components/Admin/AdminPanel';

// Создаем темную тему
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4f9eed',
    },
    secondary: {
      main: '#f44336',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  const { loading: authLoading } = useAuth();
  const [systemInitialized, setSystemInitialized] = useState(true);
  const [checkingSystem, setCheckingSystem] = useState(true);

  // Проверяем, инициализирована ли система
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        // Указываем прямой IP-адрес сервера
        const response = await axios.get('http://10.16.52.11:8080/api/system/initialized');
        console.log('Ответ инициализации:', response.data);
        setSystemInitialized(response.data.initialized);
      } catch (error) {
        console.error('Ошибка при проверке инициализации системы:', error);
        // При ошибке считаем систему не инициализированной
        setSystemInitialized(false);
      } finally {
        setCheckingSystem(false);
      }
    };
    
    checkInitialization();
  }, []);

  if (authLoading || checkingSystem) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh' 
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Routes>
        {/* Если система не инициализирована, показываем экран настройки */}
        {!systemInitialized && (
          <Route path="/setup" element={<Setup />} />
        )}
        
        {/* Перенаправляем на настройку, если система не инициализирована */}
        {!systemInitialized && (
          <Route path="*" element={<Navigate to="/setup" />} />
        )}
        
        {/* Обычные маршруты, если система инициализирована */}
        {systemInitialized && (
          <>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <PrivateRoute requireAdmin={true}>
                  <AdminPanel />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/*" 
              element={
                <PrivateRoute>
                  <ChatLayout />
                </PrivateRoute>
              } 
            />
          </>
        )}
      </Routes>
    </ThemeProvider>
  );
}

export default App;
