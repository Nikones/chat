import axios from 'axios';

// Создаем экземпляр axios с базовыми настройками
const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд
});

// Перехватчик для запросов - добавляем токен авторизации, если он есть
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик для ответов - обрабатываем общие ошибки
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Если ошибка 401 (не авторизован), выходим из системы
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Перенаправляем на страницу логина, если не там
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Логируем ошибки в консоль в режиме разработки
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }

    return Promise.reject(error);
  }
);

export default API; 