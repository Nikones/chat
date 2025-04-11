import { API_URL } from '../config';
import { getCsrfToken } from '../utils/auth';

// Получение списка чатов
export async function getChats() {
  try {
    const response = await fetch(`${API_URL}/api/chats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при получении списка чатов');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при получении списка чатов:', error);
    throw error;
  }
}

// Создание нового чата
export async function createChat(chatData) {
  try {
    const response = await fetch(`${API_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(chatData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при создании чата');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при создании чата:', error);
    throw error;
  }
}

// Получение сообщений из чата
export async function getMessages(chatId, options = {}) {
  try {
    const { limit = 50, before = '' } = options;
    let url = `${API_URL}/api/chats/${chatId}/messages?limit=${limit}`;
    
    if (before) {
      url += `&before=${before}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при получении сообщений');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    throw error;
  }
}

// Отправка сообщения
export async function sendMessage(messageData) {
  try {
    const response = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при отправке сообщения');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    throw error;
  }
}

// Редактирование сообщения
export async function editMessage(messageId, messageData) {
  try {
    const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при редактировании сообщения');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при редактировании сообщения:', error);
    throw error;
  }
}

// Удаление сообщения
export async function deleteMessage(messageId) {
  try {
    const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при удалении сообщения');
    }

    return true;
  } catch (error) {
    console.error('Ошибка при удалении сообщения:', error);
    throw error;
  }
}

// Отметка сообщений как прочитанных
export async function markAsRead(chatId, messageIds) {
  try {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({ message_ids: messageIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при отметке сообщений как прочитанных');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при отметке сообщений как прочитанных:', error);
    throw error;
  }
}

// Загрузка файла
export async function uploadFile(file, chatId) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId);
    
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при загрузке файла');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    throw error;
  }
}

// Поиск сообщений
export async function searchMessages(query, options = {}) {
  try {
    const { chatId, limit = 20, offset = 0 } = options;
    let url = `${API_URL}/api/messages/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
    
    if (chatId) {
      url += `&chat_id=${chatId}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при поиске сообщений');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при поиске сообщений:', error);
    throw error;
  }
} 