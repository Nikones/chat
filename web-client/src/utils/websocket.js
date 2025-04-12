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
    this.url = process.env.REACT_APP_WS_URL || 'wss://localhost:8000/ws';
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

    this.token = token;
    this.connect();
  }

  /**
   * Установка соединения WebSocket
   */
  connect() {
    // Отключаем существующее соединение, если оно есть
    if (this.socket) {
      this.disconnect();
    }

    try {
      const url = `${this.url}?token=${encodeURIComponent(this.token)}`;
      this.socket = new WebSocket(url);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocketService: Ошибка при создании соединения', error);
      this.notifyHandlers('onError', error);
      this.scheduleReconnect();
    }
  }

  // Настройка слушателей событий WebSocket
  setupEventListeners() {
    this.socket.onopen = (event) => {
      console.log('WebSocketService: Соединение открыто');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyHandlers('onConnect', event);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocketService: Соединение закрыто', event);
      this.isConnected = false;
      this.notifyHandlers('onDisconnect', event);
      
      // Пытаемся переподключиться только при неожиданном закрытии
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocketService: Ошибка соединения', error);
      this.notifyHandlers('onError', error);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocketService: Получено сообщение', message);
        this.notifyHandlers('onMessage', message);
      } catch (error) {
        console.error('WebSocketService: Ошибка разбора сообщения', error);
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
