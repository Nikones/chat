import axios from 'axios';
import apiInstance from './apiInstance';

// Получение списка всех пользователей
export async function getUsers() {
  try {
    console.log('Запрос списка пользователей');
    // Получаем токен из localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.get('/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    throw error;
  }
}

// Создание нового пользователя
export async function createUser(userData) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.post('/admin/users', userData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    throw error;
  }
}

// Обновление данных пользователя
export async function updateUser(userId, userData) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.put(`/admin/users/${userId}`, userData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    throw error;
  }
}

// Удаление пользователя
export async function deleteUser(userId) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.delete(`/admin/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    throw error;
  }
}

// Блокировка пользователя
export async function blockUser(userId) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.post(`/admin/users/${userId}/block`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при блокировке пользователя:', error);
    throw error;
  }
}

// Разблокировка пользователя
export async function unblockUser(userId) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.post(`/admin/users/${userId}/unblock`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при разблокировке пользователя:', error);
    throw error;
  }
}

// Получение системных настроек
export async function getSystemSettings() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.get('/admin/settings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при получении системных настроек:', error);
    throw error;
  }
}

// Обновление системных настроек
export async function updateSystemSettings(settings) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiInstance.put('/admin/settings', settings, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении системных настроек:', error);
    throw error;
  }
} 