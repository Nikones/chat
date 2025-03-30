import axios from 'axios';

// Базовый URL для API
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Используем относительный путь для продакшена
  : '/api'; // Используем относительный путь везде для совместимости с прокси

/**
 * Класс для работы с API сообщений
 */
class MessagesAPI {
  /**
   * Получение истории сообщений с пользователем
   * @param {string} userId - ID пользователя
   * @param {string} token - JWT токен
   * @returns {Promise<Array>} Список сообщений
   */
  async getMessages(userId, token) {
    try {
      const response = await axios.get(`${API_URL}/messages/${userId}`, {
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
        throw new Error(error.response.data.error || 'Ошибка получения сообщений');
      } else if (error.request) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }

  /**
   * Отправка сообщения пользователю
   * @param {string} userId - ID получателя
   * @param {string} content - Содержимое сообщения
   * @param {string} token - JWT токен
   * @returns {Promise<Object>} Отправленное сообщение
   */
  async sendMessage(userId, content, token) {
    try {
      const response = await axios.post(`${API_URL}/messages`, {
        recipient_id: userId,
        content: content
      }, {
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
        throw new Error(error.response.data.error || 'Ошибка отправки сообщения');
      } else if (error.request) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }
}

// Экспорт экземпляра класса
const messagesApi = new MessagesAPI();
export default messagesApi; 