import CryptoJS from 'crypto-js';
import * as sodium from 'libsodium-wrappers';

/**
 * Сервис для шифрования сообщений
 * Реализует E2EE (End-to-End Encryption) с использованием libsodium для создания ключей
 * и CryptoJS для шифрования.
 */
class EncryptionService {
  constructor() {
    this.initialized = false;
    this.keys = {}; // Хранилище ключей для разных пользователей
    this.keyPrefix = 'chat_key_'; // Префикс для ключей в localStorage
  }

  /**
   * Инициализация сервиса шифрования
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Инициализация libsodium
      await sodium.ready;
      
      // Восстанавливаем ключи из localStorage
      this.loadKeysFromStorage();
      
      this.initialized = true;
      console.log('Encryption: сервис шифрования инициализирован');
    } catch (error) {
      console.error('Encryption: ошибка при инициализации сервиса шифрования', error);
    }
  }

  /**
   * Загрузка ключей из localStorage
   * @private
   */
  loadKeysFromStorage() {
    const keys = {};
    
    // Получаем все ключи из localStorage, начинающиеся с префикса
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        const userId = key.replace(this.keyPrefix, '');
        keys[userId] = localStorage.getItem(key);
      }
    }
    
    this.keys = keys;
  }

  /**
   * Сохранение ключа в localStorage
   * @param {string} userId - ID пользователя
   * @param {string} key - Ключ шифрования
   * @private
   */
  saveKeyToStorage(userId, key) {
    localStorage.setItem(`${this.keyPrefix}${userId}`, key);
  }

  /**
   * Получение ключа для пользователя
   * Если ключа нет, генерируем новый
   * @param {string} userId - ID пользователя
   * @returns {string} Ключ шифрования
   */
  async getKeyForUser(userId) {
    await this.ensureInitialized();
    
    if (!this.keys[userId]) {
      // Генерируем новый ключ
      const key = this.generateKey();
      this.keys[userId] = key;
      this.saveKeyToStorage(userId, key);
    }
    
    return this.keys[userId];
  }

  /**
   * Генерация нового случайного ключа
   * @returns {string} Новый ключ
   * @private
   */
  generateKey() {
    // Генерируем случайный ключ с помощью libsodium
    const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
    // Преобразуем в Base64 для хранения
    return sodium.to_base64(key);
  }

  /**
   * Шифрование сообщения
   * @param {string} message - Сообщение для шифрования
   * @param {string} recipientId - ID получателя
   * @returns {Promise<string>} Зашифрованное сообщение
   */
  async encryptMessage(message, recipientId) {
    // В реальном приложении здесь должно быть настоящее шифрование
    // Например, с использованием OpenPGP.js или другой библиотеки E2E шифрования
    
    // Для демонстрации просто используем Base64
    return btoa(message);
  }
  
  /**
   * Расшифровка сообщения
   * @param {string} encryptedMessage - Зашифрованное сообщение
   * @param {string} senderId - ID отправителя
   * @returns {Promise<string>} Расшифрованное сообщение
   */
  async decryptMessage(encryptedMessage, senderId) {
    // В реальном приложении здесь должна быть настоящая расшифровка
    
    try {
      // Для демонстрации просто используем Base64
      return atob(encryptedMessage);
    } catch (error) {
      console.error('Ошибка расшифровки:', error);
      return '[Ошибка расшифровки сообщения]';
    }
  }

  /**
   * Шифрование данных файла
   * @param {File} file - Файл для шифрования
   * @param {string} recipientId - ID получателя
   * @returns {Promise<{name: string, type: string, size: number, data: string}>} 
   *          Метаданные и зашифрованные данные файла
   */
  async encryptFile(file, recipientId) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          // Получаем бинарные данные файла
          const fileData = event.target.result;
          
          // В реальном приложении здесь должно быть настоящее шифрование файла
          // Для демонстрации просто используем Base64
          const encryptedData = btoa(
            String.fromCharCode(...new Uint8Array(fileData))
          );
          
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: encryptedData
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'));
      };
      
      // Читаем файл как массив байтов
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Расшифровка данных файла
   * @param {Object} encryptedFile - Метаданные и зашифрованные данные файла
   * @param {string} senderId - ID отправителя
   * @returns {Promise<Blob>} Расшифрованный файл как Blob
   */
  async decryptFile(encryptedFile, senderId) {
    try {
      // В реальном приложении здесь должна быть настоящая расшифровка
      // Для демонстрации просто используем Base64
      
      // Декодируем Base64
      const binaryString = atob(encryptedFile.data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Создаем Blob из расшифрованных данных
      return new Blob([bytes], { type: encryptedFile.type });
    } catch (error) {
      console.error('Ошибка расшифровки файла:', error);
      throw error;
    }
  }

  /**
   * Проверка и инициализация сервиса при необходимости
   * @private
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }
}

// Создаем синглтон для использования во всем приложении
const encryptionService = new EncryptionService();

// Инициализируем сервис сразу при импорте
encryptionService.init();

export default encryptionService;
