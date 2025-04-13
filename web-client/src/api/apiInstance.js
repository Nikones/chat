import axios from 'axios';

// Базовый URL для API
const API_URL = '/api';

// Настраиваем axios для запросов
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 секунд
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Перехватчик для добавления заголовка авторизации к запросу
apiClient.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Перехватчик для обработки ошибок
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // Если сервер вернул ошибку 401 (Unauthorized), очищаем токен
    if (error.response && error.response.status === 401) {
      removeToken();
      
      // Перенаправляем на страницу входа, если не на ней
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient; 