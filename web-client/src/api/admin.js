import { API_URL } from '../config';
import { getCsrfToken } from '../utils/auth';

// Получение списка всех пользователей
export async function getUsers() {
  try {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при получении списка пользователей');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    throw error;
  }
}

// Создание нового пользователя
export async function createUser(userData) {
  try {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при создании пользователя');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    throw error;
  }
}

// Обновление данных пользователя
export async function updateUser(userId, userData) {
  try {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при обновлении пользователя');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    throw error;
  }
}

// Удаление пользователя
export async function deleteUser(userId) {
  try {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при удалении пользователя');
    }

    return true;
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    throw error;
  }
}

// Блокировка пользователя
export async function blockUser(userId) {
  try {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при блокировке пользователя');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при блокировке пользователя:', error);
    throw error;
  }
}

// Разблокировка пользователя
export async function unblockUser(userId) {
  try {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}/unblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при разблокировке пользователя');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при разблокировке пользователя:', error);
    throw error;
  }
}

// Получение системных настроек
export async function getSystemSettings() {
  try {
    const response = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при получении системных настроек');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при получении системных настроек:', error);
    throw error;
  }
}

// Обновление системных настроек
export async function updateSystemSettings(settings) {
  try {
    const response = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при обновлении системных настроек');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при обновлении системных настроек:', error);
    throw error;
  }
} 