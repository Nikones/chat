import axios from 'axios';

// Базовый URL для API (относительный путь)
const API_URL = '/api';

/**
 * Класс для работы с API аутентификации
 */
class AuthAPI {
  /**
   * Вход пользователя в систему
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль
   * @returns {Promise<{token: string, user: Object}>} Данные пользователя и токен
   */
  async login(username, password) {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        // Серверная ошибка
        throw new Error(error.response.data.error || 'Ошибка авторизации');
      } else if (error.request) {
        // Нет ответа от сервера
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        // Что-то пошло не так при настройке запроса
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }

  /**
   * Получение данных текущего пользователя
   * @param {string} token - JWT токен
   * @returns {Promise<Object>} Данные пользователя
   */
  async getCurrentUser(token) {
    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Сессия истекла. Пожалуйста, войдите снова');
        }
        throw new Error(error.response.data.error || 'Ошибка получения данных пользователя');
      } else if (error.request) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }

  /**
   * Получение списка пользователей (только для администраторов)
   * @param {string} token - JWT токен
   * @returns {Promise<Array>} Список пользователей
   */
  async getUsers(token) {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Сессия истекла. Пожалуйста, войдите снова');
        } else if (error.response.status === 403) {
          throw new Error('У вас нет прав для просмотра списка пользователей');
        }
        throw new Error(error.response.data.error || 'Ошибка получения списка пользователей');
      } else if (error.request) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }

  /**
   * Получение списка пользователей для чата (доступно всем)
   * @param {string} token - JWT токен
   * @returns {Promise<Array>} Список пользователей для чата
   */
  async getChatUsers(token) {
    try {
      const response = await axios.get(`${API_URL}/chat/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Сессия истекла. Пожалуйста, войдите снова');
        }
        throw new Error(error.response.data.error || 'Ошибка получения списка пользователей для чата');
      } else if (error.request) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }

  /**
   * Создание нового пользователя (только для администраторов)
   * @param {Object} userData - Данные нового пользователя
   * @param {string} token - JWT токен
   * @returns {Promise<Object>} Данные созданного пользователя
   */
  async createUser(userData, token) {
    try {
      const response = await axios.post(`${API_URL}/users`, userData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Сессия истекла. Пожалуйста, войдите снова');
        } else if (error.response.status === 403) {
          throw new Error('У вас нет прав для создания пользователей');
        }
        throw new Error(error.response.data.error || 'Ошибка создания пользователя');
      } else if (error.request) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }
}

// Экспорт экземпляра класса
const authApi = new AuthAPI();
export default authApi;

// Именованные экспорты для совместимости
export const login = (username, password) => authApi.login(username, password);
export const getCurrentUser = (token) => authApi.getCurrentUser(token);
export const logout = () => {
  // Если есть функция для выхода, добавьте её в класс AuthAPI и используйте здесь
  // Пока просто заглушка
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return Promise.resolve();
};
