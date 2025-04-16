import React, { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import UserManagement from './Admin/UserManagement';
import SystemSettings from './Admin/SystemSettings';
import SystemStats from './Admin/SystemStats';

const AdminPanel = () => {
  const auth = useAuth() || {};
  const admin = useAdmin() || {};
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);

  // Проверяем, что admin не null перед деструктуризацией
  const { users = [], isLoading = false, fetchUsers = () => {} } = admin;
  const { user = null } = auth;

  // Проверка доступа к админ-панели
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setError('У вас нет доступа к админ-панели');
    } else {
      setError(null);
    }
  }, [user]);

  // Обработчик смены вкладки
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Обработчик обновления данных
  const handleRefresh = () => {
    fetchUsers();
  };

  // Если нет прав доступа
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Если данные загружаются
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Загрузка данных...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Панель администратора
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleRefresh}
        >
          Обновить данные
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Пользователи" />
          <Tab label="Настройки" />
          <Tab label="Статистика" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <UserManagement users={users} />
      )}
      
      {activeTab === 1 && (
        <SystemSettings />
      )}
      
      {activeTab === 2 && (
        <SystemStats />
      )}
    </Container>
  );
};

export default AdminPanel; 