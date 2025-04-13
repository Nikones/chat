/**
 * Утилиты для шифрования сообщений в чате
 */

// Генерация ключа для чата
export const generateChatKey = async () => {
  try {
    // Генерируем случайный ключ
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    return key;
  } catch (error) {
    console.error('Ошибка при генерации ключа:', error);
    throw error;
  }
};

// Шифрование сообщения
export const encryptMessage = async (text, key) => {
  try {
    // Создаем вектор инициализации (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Преобразуем текст в ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Шифруем данные
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      data
    );
    
    // Объединяем IV и зашифрованные данные
    const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
    encryptedArray.set(iv, 0);
    encryptedArray.set(new Uint8Array(encryptedData), iv.length);
    
    // Преобразуем в base64 для удобной передачи
    return btoa(String.fromCharCode.apply(null, encryptedArray));
  } catch (error) {
    console.error('Ошибка при шифровании сообщения:', error);
    throw error;
  }
};

// Расшифровка сообщения
export const decryptMessage = async (encryptedText, key) => {
  try {
    // Декодируем из base64
    const encryptedArray = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    
    // Извлекаем IV (первые 12 байт)
    const iv = encryptedArray.slice(0, 12);
    
    // Извлекаем зашифрованные данные
    const encryptedData = encryptedArray.slice(12);
    
    // Расшифровываем
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      encryptedData
    );
    
    // Преобразуем обратно в строку
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Ошибка при расшифровке сообщения:', error);
    throw error;
  }
};

// Экспорт ключа для передачи другим участникам
export const exportChatKey = async (key) => {
  try {
    // Экспортируем ключ в формате JWK
    const exportedKey = await window.crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exportedKey);
  } catch (error) {
    console.error('Ошибка при экспорте ключа:', error);
    throw error;
  }
};

// Импорт ключа
export const importChatKey = async (exportedKeyString) => {
  try {
    // Парсим строку в объект
    const exportedKey = JSON.parse(exportedKeyString);
    
    // Импортируем ключ
    return await window.crypto.subtle.importKey(
      "jwk",
      exportedKey,
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error('Ошибка при импорте ключа:', error);
    throw error;
  }
};

// Шифрование ключа с помощью публичного ключа пользователя
export const encryptChatKey = async (chatKey, publicKey) => {
  // В реальном приложении здесь должна быть логика шифрования
  // с использованием публичного ключа получателя
  return chatKey;
};

// Расшифровка ключа с помощью приватного ключа
export const decryptChatKey = async (encryptedChatKey, privateKey) => {
  // В реальном приложении здесь должна быть логика расшифровки
  // с использованием приватного ключа пользователя
  return encryptedChatKey;
}; 