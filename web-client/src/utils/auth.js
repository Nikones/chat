import Cookies from 'js-cookie';

// Получение CSRF-токена из куки
export const getCsrfToken = () => {
  return Cookies.get('csrf_token') || '';
};

// Сохранение сессии в localStorage
export const saveSession = (session) => {
  localStorage.setItem('session', JSON.stringify(session));
};

// Получение сессии из localStorage
export const getSession = () => {
  const session = localStorage.getItem('session');
  if (session) {
    try {
      return JSON.parse(session);
    } catch (error) {
      console.error('Ошибка при парсинге сессии:', error);
      return null;
    }
  }
  return null;
};

// Удаление сессии из localStorage
export const clearSession = () => {
  localStorage.removeItem('session');
};

// Проверка роли пользователя
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};

// Генерация случайного ID
export const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}; 