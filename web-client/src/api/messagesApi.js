import axios from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: '', // Пустая строка для обеспечения использования относительных URL
  headers: {
    'Content-Type': 'application/json'
  }
});

// Добавляем перехватчик для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Добавляем логирование запросов в режиме разработки
if (process.env.NODE_ENV !== 'production') {
  api.interceptors.request.use(
    (config) => {
      console.log(`API запрос: ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('Ошибка при настройке API запроса:', error);
      return Promise.reject(error);
    }
  );
  
  api.interceptors.response.use(
    (response) => {
      console.log(`API ответ: ${response.status} для ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error('API ошибка:', error.response?.status || 'нет соединения');
      return Promise.reject(error);
    }
  );
}

/**
 * Получение списка чатов
 * @returns {Promise} - Промис с ответом API
 */
export const getChats = () => {
  return api.get('/api/chat');
};

/**
 * Получение сообщений чата
 * @param {string} chatId - ID чата
 * @returns {Promise} - Промис с ответом API
 */
export const getMessages = (chatId) => {
  return api.get(`/api/chat/${chatId}/messages`);
};

/**
 * Отправка сообщения
 * @param {string} chatId - ID чата
 * @param {Object} data - Данные сообщения
 * @returns {Promise} - Промис с ответом API
 */
export const sendMessage = (chatId, data) => {
  return api.post(`/api/chat/${chatId}/messages`, data);
};

/**
 * Удаление сообщения
 * @param {string} messageId - ID сообщения
 * @returns {Promise} - Промис с ответом API
 */
export const deleteMessage = (messageId) => {
  return api.delete(`/api/messages/${messageId}`);
};

/**
 * Редактирование сообщения
 * @param {string} messageId - ID сообщения
 * @param {Object} data - Новые данные сообщения
 * @returns {Promise} - Промис с ответом API
 */
export const editMessage = (messageId, data) => {
  return api.put(`/api/messages/${messageId}`, data);
};

/**
 * Отметка сообщений как прочитанных
 * @param {string} chatId - ID чата
 * @returns {Promise} - Промис с ответом API
 */
export const markAsRead = (chatId) => {
  return api.post(`/api/chat/${chatId}/read`);
};

/**
 * Создание нового чата
 * @param {Object} data - Данные для создания чата
 * @returns {Promise} - Промис с ответом API
 */
export const createChat = (data) => {
  return api.post('/api/chat', data);
};

/**
 * Получение информации о чате
 * @param {string} chatId - ID чата
 * @returns {Promise} - Промис с ответом API
 */
export const getChat = (chatId) => {
  return api.get(`/api/chat/${chatId}`);
};

/**
 * Выход из группового чата
 * @param {string} chatId - ID группового чата
 * @returns {Promise} - Промис с ответом API
 */
export const leaveChat = (chatId) => {
  return api.post(`/api/chat/${chatId}/leave`);
};

/**
 * Добавление пользователя в групповой чат
 * @param {string} chatId - ID группового чата
 * @param {string} userId - ID пользователя для добавления
 * @returns {Promise} - Промис с ответом API
 */
export const addUserToChat = (chatId, userId) => {
  return api.post(`/api/chat/${chatId}/users`, { user_id: userId });
};

/**
 * Удаление пользователя из группового чата
 * @param {string} chatId - ID группового чата
 * @param {string} userId - ID пользователя для удаления
 * @returns {Promise} - Промис с ответом API
 */
export const removeUserFromChat = (chatId, userId) => {
  return api.delete(`/api/chat/${chatId}/users/${userId}`);
};

/**
 * Обновление информации о чате
 * @param {string} chatId - ID чата
 * @param {Object} data - Новые данные чата
 * @returns {Promise} - Промис с ответом API
 */
export const updateChat = (chatId, data) => {
  return api.put(`/api/chat/${chatId}`, data);
};

export default api; 