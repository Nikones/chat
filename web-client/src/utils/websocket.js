/**
 * Сервис для работы с WebSocket соединением
 */
import { toast } from 'react-toastify';
import { WS_URL, WS_PATH } from '../config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.messageHandlers = [];
    this.isConnected = false;
    this.reconnecting = false;
    this.reconnectCount = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 секунд
    this.reconnectTimeoutId = null;
    
    // Определяем URL для WebSocket
    // 1. Используем WS_URL, если он задан в config
    // 2. Иначе строим относительный URL на основе текущего хоста
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const relativeUrl = `${protocol}//${host}${WS_PATH}`;
    
    this.wsUrl = WS_URL || relativeUrl;
    console.log('WebSocketService: URL для подключения:', this.wsUrl);
  }

  /**
   * Инициализация сервиса
   * @param {string} token - JWT токен для авторизации
   */
  init(token) {
    console.log('WebSocketService: инициализация с токеном', token ? 'Токен предоставлен' : 'Токен отсутствует');
    this.token = token;
    // Если нет токена, не подключаемся
    if (!token) {
      this.disconnect();
      return;
    }
    
    // Подключаемся, если не подключены
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }
  }

  /**
   * Установка соединения WebSocket
   */
  connect() {
    // Проверяем, есть ли токен для авторизации
    if (!this.token) {
      console.warn('WebSocketService: невозможно подключиться без токена авторизации');
      return;
    }

    // Предотвращаем повторные попытки подключения
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.log('WebSocketService: соединение уже установлено или в процессе установки');
      return;
    }

    try {
      // Формируем URL с токеном авторизации
      const url = `${this.wsUrl}?token=${this.token}`;
      console.log(`WebSocketService: подключение к ${this.wsUrl}`);
      
      // Создаем новое соединение
      this.socket = new WebSocket(url);
      
      // Настраиваем обработчики событий
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocketService: ошибка при создании WebSocket соединения:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Закрытие соединения WebSocket
   */
  disconnect() {
    // Отменяем запланированное переподключение, если оно было
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Закрываем соединение, если оно открыто
    if (this.socket) {
      try {
        // Только если соединение открыто или в процессе открытия
        if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close(1000, 'Клиент запросил отключение');
        }
      } catch (error) {
        console.error('WebSocketService: ошибка при закрытии соединения:', error);
      } finally {
        this.socket = null;
        this.isConnected = false;
        console.log('WebSocketService: соединение закрыто');
      }
    }
  }

  /**
   * Отправка сообщения через WebSocket
   * @param {Object} message - Сообщение для отправки
   * @returns {boolean} Успешно ли отправлено сообщение
   */
  sendMessage(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketService: невозможно отправить сообщение - соединение не установлено');
      toast.error('Ошибка соединения с сервером');
      return false;
    }
    
    try {
      // Отправляем сообщение без шифрования
      console.log('WebSocketService: отправка сообщения', message);
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('WebSocketService: ошибка при отправке сообщения:', error);
      return false;
    }
  }

  /**
   * Добавление обработчика для входящих сообщений
   * @param {Function} handler - Функция обработчик
   */
  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  /**
   * Удаление обработчика для входящих сообщений
   * @param {Function} handler - Функция обработчик
   */
  removeMessageHandler(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * Обработчик события открытия соединения
   * @private
   */
  handleOpen(event) {
    console.log('WebSocketService: соединение установлено');
    this.isConnected = true;
    this.reconnectCount = 0; // Сбрасываем счетчик переподключений при успешном соединении
    
    // Оповещаем всех подписчиков о подключении
    this.messageHandlers.forEach(handler => {
      if (handler.onConnect) {
        handler.onConnect();
      }
    });
  }

  /**
   * Обработчик события закрытия соединения
   * @private
   */
  handleClose(event) {
    this.isConnected = false;
    
    // Оповещаем всех подписчиков о закрытии соединения
    this.messageHandlers.forEach(handler => {
      if (handler.onDisconnect) {
        handler.onDisconnect(event);
      }
    });
    
    // Логируем событие закрытия
    console.log(`WebSocketService: соединение закрыто с кодом ${event.code}${event.reason ? `, причина: ${event.reason}` : ''}`);
    
    // Переподключаемся только если это не было чистое закрытие
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Обработчик ошибок WebSocket
   * @private
   */
  handleError(error) {
    console.error('WebSocketService: ошибка соединения:', error);
    
    // Оповещаем всех подписчиков об ошибке
    this.messageHandlers.forEach(handler => {
      if (handler.onError) {
        handler.onError(error);
      }
    });
    
    // В случае ошибки обычно WebSocket закрывается, но на всякий случай запланируем переподключение
    this.scheduleReconnect();
  }

  /**
   * Обработчик входящих сообщений
   * @private
   */
  handleMessage(event) {
    try {
      console.log('WebSocketService: получено сообщение', event.data);
      const data = JSON.parse(event.data);
      
      // Оповещаем всех подписчиков о новом сообщении
      this.messageHandlers.forEach(handler => {
        if (handler.onMessage) {
          handler.onMessage(data);
        }
      });
    } catch (error) {
      console.error('WebSocketService: ошибка при обработке сообщения:', error);
    }
  }

  /**
   * Планирование переподключения
   * @private
   */
  scheduleReconnect() {
    // Предотвращаем множественные таймеры переподключения
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    this.reconnectCount++;
    
    // Проверяем, не превышено ли максимальное количество попыток
    if (this.reconnectCount > this.maxReconnectAttempts) {
      console.warn(`WebSocketService: превышено максимальное количество попыток переподключения (${this.maxReconnectAttempts})`);
      this.reconnecting = false;
      // Оповещаем всех подписчиков о невозможности переподключения
      this.messageHandlers.forEach(handler => {
        if (handler.onReconnectFailed) {
          handler.onReconnectFailed();
        }
      });
      return;
    }
    
    // Рассчитываем время до следующей попытки с экспоненциальным ростом
    const delay = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectCount - 1));
    console.log(`WebSocketService: попытка переподключения ${this.reconnectCount} из ${this.maxReconnectAttempts} через ${delay}мс`);
    
    // Планируем переподключение
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnecting = false;
      this.connect();
    }, delay);
  }
}

// Создаем и экспортируем экземпляр сервиса
const websocketService = new WebSocketService();
export default websocketService;
