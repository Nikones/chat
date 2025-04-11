import axios from 'axios';

// Базовый URL для API
const API_URL = '/api';

/**
 * Класс для работы с API файлов
 */
class FilesAPI {
  /**
   * Загрузка файла
   * @param {File} file - Файл для загрузки
   * @param {number} recipientId - ID получателя
   * @param {string} message - Сопроводительное сообщение (опционально)
   * @param {string} token - JWT токен
   * @returns {Promise<Object>} Данные о загруженном файле
   */
  async uploadFile(file, recipientId, message, token) {
    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recipient_id', recipientId);
      if (message) {
        formData.append('message', message);
      }
      
      const response = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Сессия истекла. Пожалуйста, войдите снова');
        }
        throw new Error(error.response.data.error || 'Ошибка загрузки файла');
      } else if (error.request) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету');
      } else {
        throw new Error('Ошибка при отправке запроса');
      }
    }
  }

  /**
   * Получение URL для скачивания файла
   * @param {string} token - Токен для скачивания файла
   * @returns {string} URL для скачивания файла
   */
  getDownloadUrl(token) {
    return `${API_URL}/files/download/${token}`;
  }
  
  /**
   * Определение типа файла по MIME типу
   * @param {string} mimeType - MIME тип файла
   * @returns {string} Тип файла (image, audio, video, document, other)
   */
  getFileTypeByMime(mimeType) {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (
      mimeType === 'application/pdf' || 
      mimeType.startsWith('application/msword') || 
      mimeType.startsWith('application/vnd.openxmlformats-officedocument')
    ) {
      return 'document';
    } else {
      return 'other';
    }
  }
  
  /**
   * Форматирование размера файла
   * @param {number} bytes - Размер в байтах
   * @returns {string} Отформатированный размер
   */
  formatFileSize(bytes) {
    if (bytes < 1024) {
      return bytes + ' Б';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' КБ';
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' ГБ';
    }
  }
}

// Экспорт экземпляра класса
const filesApi = new FilesAPI();
export default filesApi; 