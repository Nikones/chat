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
      // Используем базовый URL без токена
      console.log('WebSocketService: Подключение к', this.url, 'с использованием токена в заголовке');
      
      // Создаем объект WebSocket с поддержкой заголовка авторизации
      this.socket = new WebSocket(this.url, [`token:${this.token}`]);
      
      // Для отладки
      console.log('WebSocketService: WebSocket объект создан. Текущее состояние:', 
        this.getReadyStateText(this.socket.readyState));
      
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocketService: Ошибка при создании соединения', error);
      console.error('WebSocketService: Тип ошибки:', error.name, 'Сообщение:', error.message);
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
    if (!this.isConnected || !this.socket) {
      console.warn('WebSocketService: Попытка отправить сообщение без соединения');
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
}

// Создаем и экспортируем единственный экземпляр сервиса
const wsService = new WebSocketService();
export default wsService;
