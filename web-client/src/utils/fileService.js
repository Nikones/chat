import axios from 'axios';
import { toast } from 'react-toastify';

class FileService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  }

  /**
   * Загружает файл на сервер без шифрования
   * 
   * @param {File} file - Файл для загрузки
   * @param {string} token - JWT токен для авторизации
   * @returns {Promise<{id: string, url: string}>} - Идентификатор и URL файла
   */
  async uploadFile(file, token) {
    if (!file) {
      throw new Error('Файл не предоставлен');
    }

    if (!token) {
      throw new Error('Токен не предоставлен');
    }

    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('file', file);

      // Отправляем файл на сервер
      const response = await axios.post(`${this.apiUrl}/api/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Файл успешно загружен:', response.data);
      return response.data;
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      
      // Показываем пользователю сообщение об ошибке
      toast.error('Не удалось загрузить файл: ' + 
        (error.response?.data?.message || error.message || 'Неизвестная ошибка'));
      
      throw error;
    }
  }

  /**
   * Загружает файл с сервера по его идентификатору
   * 
   * @param {string} fileId - Идентификатор файла
   * @param {string} token - JWT токен для авторизации
   * @returns {Promise<Blob>} - Загруженный файл
   */
  async downloadFile(fileId, token) {
    if (!fileId) {
      throw new Error('Идентификатор файла не предоставлен');
    }

    if (!token) {
      throw new Error('Токен не предоставлен');
    }

    try {
      // Запрашиваем файл с сервера
      const response = await axios.get(`${this.apiUrl}/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob' // Важно для загрузки файлов
      });

      // Возвращаем blob для дальнейшей обработки
      console.log('Файл успешно загружен с сервера');
      return response.data;
    } catch (error) {
      console.error('Ошибка при загрузке файла с сервера:', error);
      
      // Показываем пользователю сообщение об ошибке
      toast.error('Не удалось загрузить файл: ' + 
        (error.response?.data?.message || error.message || 'Неизвестная ошибка'));
      
      throw error;
    }
  }

  /**
   * Получает и открывает URL для предпросмотра файла
   * 
   * @param {Blob} blob - Blob файла
   * @param {string} fileName - Имя файла (опционально)
   * @returns {string} - URL для предпросмотра
   */
  createPreviewUrl(blob, fileName) {
    // Создаем URL для просмотра файла в браузере
    const url = URL.createObjectURL(blob);
    
    // Если указано имя файла, пытаемся определить тип файла
    if (fileName) {
      // Здесь можно добавить логику для определения типа файла
      // и соответствующей обработки предпросмотра
    }
    
    return url;
  }

  /**
   * Освобождает URL предпросмотра
   * 
   * @param {string} url - URL для освобождения
   */
  revokePreviewUrl(url) {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Скачивает файл и сохраняет его с указанным именем
   * 
   * @param {Blob} blob - Blob файла
   * @param {string} fileName - Имя файла для сохранения
   */
  saveFile(blob, fileName) {
    // Создаем ссылку для скачивания
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    
    // Добавляем ссылку в DOM, кликаем по ней и удаляем
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Освобождаем URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

export default new FileService(); 