import axios from 'axios';

// Базовый URL для API - используем относительный путь
const API_URL = '/api';

// URL для проверки статуса системы
export const SYSTEM_STATUS_URL = `${API_URL}/system/status`;

// Создаем экземпляр axios с базовыми настройками
const apiInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 секунд таймаут для запросов
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик запросов для добавления токена авторизации
apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Проверка статуса инициализации системы
export const checkSystemInitialization = async () => {
  try {
    console.log('API: Проверка статуса инициализации системы');
    
    // Используем эндпоинт статуса системы
    const response = await apiInstance.get('/system/status');
    console.log('API: Получен ответ о статусе системы:', response.data);
    
    return {
      initialized: response.data.initialized,
      status: response.data.status,
      error: null
    };
  } catch (error) {
    console.error('API: Ошибка при проверке статуса системы:', error);
    
    // При ошибке 404 предполагаем, что API не настроен
    if (error.response && error.response.status === 404) {
      console.log('API: Эндпоинт /system/status не найден, проверяем /system/initialized');
      
      try {
        // Попробуем запросить оригинальный эндпоинт
        const initResponse = await apiInstance.get('/system/initialized');
        console.log('API: Получен ответ с /system/initialized:', initResponse.data);
        
        return {
          initialized: initResponse.data.initialized,
          status: 'ok',
          error: null
        };
      } catch (initError) {
        console.error('API: Вторая ошибка при проверке инициализации:', initError);
        
        // Если оба эндпоинта недоступны, считаем систему не инициализированной
        return {
          initialized: false,
          status: 'unknown',
          error: 'Системные API недоступны'
        };
      }
    }
    
    // Для других ошибок возвращаем false, чтобы пользователь мог попытаться инициализировать систему
    return {
      initialized: false,
      status: 'error',
      error: error.message
    };
  }
};

// Обработчик ответов с ошибками
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Обработка типичных ошибок
    if (error.response) {
      // Ошибка от сервера
      if (error.response.status === 401) {
        // Проверяем, существует ли токен
        const token = localStorage.getItem('auth_token');
        if (token) {
          console.warn('API: Получен 401 несмотря на наличие токена, возможно токен истек');
          // Можно добавить механизм обновления токена или очистки сессии
          // localStorage.removeItem('auth_token');
          // localStorage.removeItem('user_data');
        } else {
          console.warn('Требуется авторизация. Токен отсутствует.');
        }
      }
    } else if (error.request) {
      // Нет ответа от сервера
      console.error('Сервер недоступен. Проверьте подключение к интернету');
    } else {
      // Ошибка при настройке запроса
      console.error('Ошибка при отправке запроса', error);
    }
    
    return Promise.reject(error);
  }
);

export default apiInstance; 