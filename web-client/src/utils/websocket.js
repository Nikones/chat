/**
 * Сервис для работы с WebSocket соединением
 */
import { toast } from 'react-toastify';
import { WS_URL, API_URL } from '../config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 1000; // начальная задержка 1 секунда
    this.messageHandlers = [];
    // Используем WS_URL из конфигурации или переменной окружения
    this.url = WS_URL || process.env.REACT_APP_WS_URL || 'wss://chat.kikita.ru/api/ws';
    this.token = null;
  }

  /**
   * Инициализация сервиса
   * @param {string} token - JWT токен для авторизации
   */
  init(token) {
    if (!token) {
      console.error('WebSocketService: Попытка инициализации без токена');
      return;
    }

    console.log('WebSocketService: Инициализация с токеном. Первые 10 символов:', token.substring(0, 10) + '...');
    console.log('WebSocketService: Длина токена:', token.length);
    
    this.token = token;
    // Логируем URL WebSocket для отладки
    console.log('WebSocketService: Инициализация с URL:', this.url);
    
    // Добавляем небольшую задержку перед подключением для отладки
    console.log('WebSocketService: Добавляем задержку в 500мс перед подключением');
    setTimeout(() => {
      this.connect();
    }, 500);
  }

  /**
   * Установка соединения WebSocket
   */
  connect() {
    // Отключаем существующее соединение, если оно есть
    if (this.socket) {
      console.log('WebSocketService: Отключаем существующее соединение перед новым подключением');
      this.disconnect();
    }

    try {
      // Добавляем токен как параметр запроса вместо подпротокола
      const wsUrlWithToken = `${this.url}?token=${encodeURIComponent(this.token)}`;
      console.log('WebSocketService: Подключение к WebSocket с токеном в URL');
      console.log('WebSocketService: URL для подключения (без токена для безопасности):', this.url);
      
      // Создаем объект WebSocket без подпротокола
      this.socket = new WebSocket(wsUrlWithToken);
      
      // Расширенное логирование для отладки
      console.log('WebSocketService: WebSocket объект создан. Текущее состояние:', 
        this.getReadyStateText(this.socket.readyState));
      console.log('WebSocketService: Протокол:', this.socket.protocol || 'не указан');
      console.log('WebSocketService: Поддерживаемые расширения:', this.socket.extensions || 'не указаны');
      
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocketService: Ошибка при создании соединения', error);
      console.error('WebSocketService: Тип ошибки:', error.name, 'Сообщение:', error.message);
      console.error('WebSocketService: Стек вызовов:', error.stack);
      this.notifyHandlers('onError', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Получение текстового представления состояния WebSocket
   */
  getReadyStateText(readyState) {
    switch(readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING (0)';
      case WebSocket.OPEN: return 'OPEN (1)';
      case WebSocket.CLOSING: return 'CLOSING (2)';
      case WebSocket.CLOSED: return 'CLOSED (3)';
      default: return `UNKNOWN (${readyState})`;
    }
  }

  /**
   * Настройка обработчиков событий WebSocket
   */
  setupEventListeners() {
    if (!this.socket) {
      console.error('WebSocketService: Невозможно настроить обработчики для null сокета');
      return;
    }

    this.socket.onopen = (event) => {
      console.log('WebSocketService: Соединение установлено успешно. Детали события:', event);
      console.log('WebSocketService: Текущее состояние после open:', 
        this.getReadyStateText(this.socket.readyState));
      console.log('WebSocketService: Отправляем отладочное сообщение для проверки соединения');
      
      // Отправим тестовое сообщение для проверки соединения
      try {
        this.sendMessage({type: "PING", data: {timestamp: Date.now()}});
      } catch (error) {
        console.error('WebSocketService: Ошибка при отправке тестового сообщения:', error);
      }
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyHandlers('onOpen', event);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocketService: Соединение закрыто. Детали:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      console.log('WebSocketService: Описание кода закрытия:', this.getCloseEventDescription(event.code));
      this.isConnected = false;
      this.notifyHandlers('onClose', event);

      // Если соединение закрыто не "чисто", пытаемся переподключиться
      if (!event.wasClean) {
        console.log('WebSocketService: Нечистое закрытие соединения, планируем переподключение');
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocketService: Ошибка соединения:', error);
      // Дополнительная информация для отладки
      console.error('WebSocketService: Текущее состояние сокета:', 
        this.getReadyStateText(this.socket.readyState));
      console.error('WebSocketService: Детали ошибки (если доступны):', 
        error.message, error.type, error.code);
      
      this.notifyHandlers('onError', error);
    };

    this.socket.onmessage = (event) => {
      try {
        console.log('WebSocketService: Получено сообщение. Размер данных:', 
          event.data.length, 'байт');
          
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('WebSocketService: Обработано сообщение типа:', 
          data.type || 'неизвестный тип');
          
        this.notifyHandlers('onMessage', data);
      } catch (error) {
        console.error('WebSocketService: Ошибка при обработке сообщения:', error);
        console.error('WebSocketService: Необработанные данные:', event.data);
      }
    };
  }

  // Запланировать переподключение с экспоненциальной задержкой
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocketService: Превышено максимальное количество попыток переподключения');
      this.notifyHandlers('onReconnectFailed');
      return;
    }
    
    // Экспоненциальное увеличение задержки
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`WebSocketService: Попытка переподключения через ${delay}ms (попытка ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts += 1;
      this.connect();
    }, delay);
  }

  /**
   * Отправка сообщения через WebSocket
   * @param {Object} message - Сообщение для отправки
   * @returns {boolean} Успешно ли отправлено сообщение
   */
  sendMessage(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) { 
      console.warn('WebSocketService: Попытка отправить сообщение без установленного соединения');
      return false; 
    }
    
    try {
      if (typeof message === 'object') {
        this.socket.send(JSON.stringify(message));
      } else {
        this.socket.send(message);
      }
      return true;
    } catch (error) {
      console.error('WebSocketService: Ошибка отправки сообщения', error);
      return false;
    }
  }

  /**
   * Добавление обработчика для входящих сообщений
   * @param {Object} handler - Объект с функциями обработчиками
   */
  addMessageHandler(handler) {
    if (typeof handler === 'object') {
      this.messageHandlers.push(handler);
    }
  }

  /**
   * Удаление обработчика для входящих сообщений
   * @param {Object} handler - Объект с функциями обработчиками
   */
  removeMessageHandler(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  // Уведомление всех обработчиков о событии
  notifyHandlers(eventName, data) {
    this.messageHandlers.forEach(handler => {
      if (handler && typeof handler[eventName] === 'function') {
        handler[eventName](data);
      }
    });
  }

  /**
   * Закрытие соединения WebSocket
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
    console.log('WebSocketService: Соединение отключено');
  }

  // Добавляем функцию для получения описания кода закрытия
  getCloseEventDescription(code) {
    const descriptions = {
      1000: 'Нормальное закрытие - соединение успешно выполнило свою задачу',
      1001: 'Уход - серверное приложение завершается или клиент закрывает страницу',
      1002: 'Ошибка протокола - получено сообщение с ошибкой, которую невозможно обработать',
      1003: 'Неприемлемый тип данных - получен тип данных, который невозможно обработать',
      1004: 'Зарезервировано',
      1005: 'Нет статуса - соединение закрылось без отправки кода закрытия',
      1006: 'Соединение аномально закрылось - без получения фрейма закрытия',
      1007: 'Некорректные данные - сообщение содержит несоответствующие типу данные',
      1008: 'Нарушение правил - сообщение нарушает правила, определенные сервером',
      1009: 'Сообщение слишком большое - размер сообщения превышает ожидаемый',
      1010: 'Требуемое расширение - клиент завершает соединение из-за отсутствия расширений',
      1011: 'Внутренняя ошибка - сервер столкнулся с непредвиденной ошибкой',
      1012: 'Перезагрузка службы - сервер перезагружается',
      1013: 'Попробуйте позже - сервер временно недоступен',
      1014: 'Плохой шлюз - сервер-шлюз получил неверный ответ',
      1015: 'TLS отказ - соединение закрылось из-за ошибки TLS'
    };
    
    return descriptions[code] || `Неизвестный код (${code})`;
  }
}

// Создаем и экспортируем единственный экземпляр сервиса
const wsService = new WebSocketService();
export default wsService;
