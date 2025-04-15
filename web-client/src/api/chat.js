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
export const createChat = async (chatData) => {
  try {
    const response = await axios.post(`${API_URL}/chats`, chatData, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

// Получение сообщений чата
export const getMessages = async (chatId, page = 1, limit = 50) => {
  try {
    const response = await axios.get(`${API_URL}/chats/${chatId}/messages`, {
      params: { page, limit },
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Отправка сообщения
export const sendMessageApi = async (messageData) => {
  try {
    const response = await axios.post(`${API_URL}/chats/${messageData.chatId}/messages`, messageData, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Отметка сообщений как прочитанных
export const markMessagesAsRead = async (chatId) => {
  try {
    const response = await axios.post(`${API_URL}/chats/${chatId}/read`, {}, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Получение участников чата
export const getChatParticipants = async (chatId) => {
  try {
    const response = await axios.get(`${API_URL}/chats/${chatId}/participants`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting chat participants:', error);
    throw error;
  }
};

// Добавление участника в чат
export const addChatParticipant = async (chatId, userId) => {
  try {
    const response = await axios.post(`${API_URL}/chats/${chatId}/participants`, { userId }, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding chat participant:', error);
    throw error;
  }
};

// Удаление участника из чата
export const removeChatParticipant = async (chatId, userId) => {
  try {
    const response = await axios.delete(`${API_URL}/chats/${chatId}/participants/${userId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error removing chat participant:', error);
    throw error;
  }
}; 