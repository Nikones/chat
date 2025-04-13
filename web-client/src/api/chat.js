import axios from 'axios';

/**
 * API-функции для работы с чатами
 */

const API_URL = '/api';

// Получение списка чатов пользователя
export const getChats = async () => {
  try {
    const response = await axios.get(`${API_URL}/chats`);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении списка чатов:', error);
    throw error;
  }
};

// Создание нового чата
export const createChat = async (userId) => {
  try {
    const response = await axios.post(`${API_URL}/chats`, { userId });
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании чата:', error);
    throw error;
  }
};

// Получение сообщений чата
export const getMessages = async (chatId, limit = 50, offset = 0) => {
  try {
    const response = await axios.get(`${API_URL}/chats/${chatId}/messages`, {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    throw error;
  }
};

// Отправка сообщения
export const sendMessageApi = async (messageData) => {
  try {
    const response = await axios.post(`${API_URL}/chats/${messageData.chatId}/messages`, messageData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    throw error;
  }
};

// Отметка сообщений как прочитанных
export const markMessagesAsRead = async (chatId, messageIds) => {
  try {
    const response = await axios.post(`${API_URL}/chats/${chatId}/read`, { messageIds });
    return response.data;
  } catch (error) {
    console.error('Ошибка при отметке сообщений как прочитанных:', error);
    throw error;
  }
};

// Получение участников чата
export const getChatParticipants = async (chatId) => {
  try {
    const response = await axios.get(`${API_URL}/chats/${chatId}/participants`);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении участников чата:', error);
    throw error;
  }
};

// Добавление участника в чат
export const addChatParticipant = async (chatId, userId) => {
  try {
    const response = await axios.post(`${API_URL}/chats/${chatId}/participants`, { userId });
    return response.data;
  } catch (error) {
    console.error('Ошибка при добавлении участника в чат:', error);
    throw error;
  }
};

// Удаление участника из чата
export const removeChatParticipant = async (chatId, userId) => {
  try {
    const response = await axios.delete(`${API_URL}/chats/${chatId}/participants/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Ошибка при удалении участника из чата:', error);
    throw error;
  }
}; 