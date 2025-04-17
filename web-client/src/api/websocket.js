/**
 * Сервис для работы с WebSocket соединением
 */
class WebSocketService {
  constructor(onMessage, onClose, onError) {
    this.socket = null;
    this.token = null;
    this.connected = false;
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onError = onError;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeoutId = null;
  }

  // Инициализация с токеном
  init(token) {
    this.token = token;
    console.log('WebSocketService: Инициализация с новым токеном');
  }

  // Установка соединения
  connect() {
    // Получаем токен из localStorage
    this.token = localStorage.getItem('token');
    
    if (!this.token) {
      console.error('WebSocketService: Попытка подключения без токена');
      return;
    }

    if (this.socket) {
      console.log('WebSocketService: Закрытие предыдущего соединения');
      this.socket.close();
    }

    try {
      // Формирование URL для WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws?token=${encodeURIComponent(this.token)}`;
      
      console.log('WebSocketService: Подключение к ' + wsUrl.replace(this.token, '[СКРЫТО]'));
      
      this.socket = new WebSocket(wsUrl);
      
      // Обработчики событий WebSocket
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      
      return true;
    } catch (error) {
      console.error('WebSocketService: Ошибка при создании соединения', error);
      return false;
    }
  }

  // Обработка открытия соединения
  handleOpen() {
    console.log('WebSocketService: Соединение установлено');
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Отправляем ping для проверки
    setTimeout(() => {
      this.sendPing();
    }, 1000);
  }

  // Обработка закрытия соединения
  handleClose(event) {
    console.log(`WebSocketService: Соединение закрыто (${event.code}: ${event.reason})`);
    this.connected = false;
    
    if (this.onClose) {
      this.onClose(event);
    }
    
    // Пытаемся переподключиться, если соединение закрылось не по нашей инициативе
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`WebSocketService: Повторное подключение через ${delay}ms (попытка ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    }
  }

  // Обработка ошибок
  handleError(error) {
    console.error('WebSocketService: Ошибка соединения', error);
    
    if (this.onError) {
      this.onError(error);
    }
  }

  // Обработка входящих сообщений
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('WebSocketService: Получено сообщение', message.type);
      
      if (this.onMessage) {
        this.onMessage(message);
      }
    } catch (error) {
      console.error('WebSocketService: Ошибка при обработке сообщения', error);
    }
  }

  // Отправка сообщения
  send(type, payload) {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketService: Попытка отправки без активного соединения');
      return false;
    }
    
    try {
      const message = JSON.stringify({ type, payload });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('WebSocketService: Ошибка при отправке', error);
      return false;
    }
  }

  // Отправка ping для проверки соединения
  sendPing() {
    return this.send('ping', { timestamp: new Date().toISOString() });
  }

  // Закрытие соединения
  disconnect() {
    console.log('WebSocketService: Закрытие соединения');
    
    clearTimeout(this.reconnectTimeoutId);
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connected = false;
  }
}

export default WebSocketService; 