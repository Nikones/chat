/**
 * ВНИМАНИЕ: Этот файл является заглушкой. E2EE больше не используется.
 * Вместо этого используется серверное шифрование (SSE) + TLS.
 * 
 * Этот файл оставлен только для обратной совместимости с импортами.
 */

/**
 * Заглушка для шифрования
 * 
 * ПРИМЕЧАНИЕ: Эта реализация является ЗАГЛУШКОЙ и НЕ выполняет никакого шифрования.
 * Вместо E2EE используется комбинация TLS и серверного шифрования (SSE).
 */

// Выводим предупреждение в консоль о заглушке
console.warn(
  'ВНИМАНИЕ: Модуль E2EE заменен заглушкой! ' +
  'Сквозное шифрование отключено в пользу TLS + SSE (серверного шифрования)'
);

class EncryptionService {
  constructor() {
    this.initialized = true;
    console.log('EncryptionService: инициализирован (заглушка)');
  }

  /**
   * Заглушка: просто возвращает сообщение без изменений
   */
  encryptMessage(message) {
    console.warn('EncryptionService: используется заглушка вместо шифрования');
    return message;
  }

  /**
   * Заглушка: просто возвращает сообщение без изменений
   */
  decryptMessage(message) {
    console.warn('EncryptionService: используется заглушка вместо дешифрования');
    return message;
  }

  /**
   * Заглушка: просто возвращает файл без изменений
   */
  encryptFile(file) {
    console.warn('EncryptionService: используется заглушка вместо шифрования файла');
    return Promise.resolve(file);
  }

  /**
   * Заглушка: просто возвращает файл без изменений
   */
  decryptFile(file) {
    console.warn('EncryptionService: используется заглушка вместо дешифрования файла');
    return Promise.resolve(file);
  }

  /**
   * Заглушка: генерирует фиктивный ключ (не используется)
   */
  generateKey() {
    console.warn('EncryptionService: запрошена генерация ключа (заглушка)');
    return Promise.resolve('fake-key-12345');
  }

  /**
   * Заглушка: возвращает фиктивный ключ (не используется)
   */
  getPublicKey() {
    console.warn('EncryptionService: запрошен публичный ключ (заглушка)');
    return 'fake-public-key-12345';
  }

  /**
   * Заглушка: сохраняет ключ в localStorage (не используется)
   */
  storeKey(keyData) {
    console.warn('EncryptionService: запрошено сохранение ключа (заглушка)');
    localStorage.setItem('fake_key', JSON.stringify({
      timestamp: new Date().toISOString(),
      keyId: 'fake-key-id'
    }));
    return Promise.resolve(true);
  }

  /**
   * Заглушка: проверяет наличие фиктивного ключа
   */
  hasKey() {
    return !!localStorage.getItem('fake_key');
  }

  /**
   * Заглушка: импорт ключа (всегда успешен)
   */
  importKey(keyData) {
    console.warn('EncryptionService: запрошен импорт ключа (заглушка)');
    localStorage.setItem('fake_key', JSON.stringify({
      timestamp: new Date().toISOString(),
      keyId: 'imported-fake-key'
    }));
    return Promise.resolve(true);
  }
}

// Экспортируем экземпляр сервиса
export default new EncryptionService();

// Заглушки для дополнительных функций
export async function generateKeyPair() {
  console.warn('generateKeyPair: E2EE больше не используется.');
  return { publicKey: {}, privateKey: {} };
}

export async function deriveSharedSecret() {
  console.warn('deriveSharedSecret: E2EE больше не используется.');
  return '';
}

export async function encryptMessage(message) {
  console.warn('encryptMessage: E2EE больше не используется.');
  return message;
}

export async function decryptMessage(message) {
  console.warn('decryptMessage: E2EE больше не используется.');
  return message;
}

export const generateRegistrationId = async () => {
  console.warn('generateRegistrationId: E2EE больше не используется.');
  return 0;
};

export const generatePreKeys = async () => {
  console.warn('generatePreKeys: E2EE больше не используется.');
  return [];
};

export const generateSignedPreKey = async () => {
  console.warn('generateSignedPreKey: E2EE больше не используется.');
  return {};
};

export const initSignalProtocol = async () => {
  console.warn('initSignalProtocol: E2EE больше не используется.');
  return {};
};

export const createSession = async () => {
  console.warn('createSession: E2EE больше не используется.');
  return {};
};

export const getOrCreateSession = async () => {
  console.warn('getOrCreateSession: E2EE больше не используется.');
  return {};
};

export const clearSignalData = () => {
  console.warn('clearSignalData: E2EE больше не используется.');
};
