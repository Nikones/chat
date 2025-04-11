/**
 * Конфигурация клиента - глобальные переменные, доступные в браузере
 */
window.APP_CONFIG = {
  // API URL
  API_URL: '/api',
  
  // WebSocket URL (относительный)
  WS_URL: '/api/ws',
  
  // URL для LiveKit (видеозвонки)
  LIVEKIT_URL: '/livekit',
  
  // Версия приложения
  VERSION: '1.0.0'
};

// Конфигурационный файл для клиентского приложения
window._SITE_URL = "https://chat.kikita.ru";
window._WS_URL = "wss://chat.kikita.ru/ws";
window.VITE_WS_URL = "wss://chat.kikita.ru/ws";
window.VITE_API_URL = "https://chat.kikita.ru";

// API URL для локальной разработки
window.DEV_API_URL = "http://10.16.52.15:9095";
window.DEV_WS_URL = "ws://10.16.52.15:9091";

// Установка значений по умолчанию для режима разработки
if (!window.VITE_WS_URL) {
  console.warn("VITE_WS_URL не определен, используем значение по умолчанию");
  window.VITE_WS_URL = "ws://localhost:9091";
}

if (!window.VITE_API_URL) {
  console.warn("VITE_API_URL не определен, используем значение по умолчанию");
  window.VITE_API_URL = "http://localhost:9095";
} 