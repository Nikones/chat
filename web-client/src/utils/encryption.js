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
   * @param {string} userId - ID пользователя, для которого шифруется сообщение
   * @returns {string} Зашифрованное сообщение в формате Base64
   */
  async encryptMessage(message, userId) {
    await this.ensureInitialized();
    
    try {
      // Получаем ключ для пользователя
      const key = await this.getKeyForUser(userId);
      
      // Генерируем случайный IV (Initialization Vector)
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Шифруем сообщение с использованием AES-CBC
      const encrypted = CryptoJS.AES.encrypt(message, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });
      
      // Объединяем IV и зашифрованное сообщение
      const result = iv.toString(CryptoJS.enc.Hex) + encrypted.toString();
      
      return result;
    } catch (error) {
      console.error('Encryption: ошибка при шифровании сообщения', error);
      throw error;
    }
  }

  /**
   * Расшифровка сообщения
   * @param {string} encryptedMessage - Зашифрованное сообщение
   * @param {string} userId - ID пользователя, от которого получено сообщение
   * @returns {string} Расшифрованное сообщение
   */
  async decryptMessage(encryptedMessage, userId) {
    await this.ensureInitialized();
    
    try {
      // Получаем ключ для пользователя
      const key = await this.getKeyForUser(userId);
      
      // Извлекаем IV из сообщения (первые 32 символа - это IV в hex)
      const iv = CryptoJS.enc.Hex.parse(encryptedMessage.substring(0, 32));
      const encrypted = encryptedMessage.substring(32);
      
      // Расшифровываем сообщение
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Encryption: ошибка при расшифровке сообщения', error);
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
