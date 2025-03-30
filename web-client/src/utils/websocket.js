/**
 * Сервис для работы с WebSocket соединением
 */
class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = [];
    this.connectHandlers = [];
    this.disconnectHandlers = [];
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 секунд
    this.token = null;
  }

  /**
   * Инициализация сервиса
   * @param {string} token - JWT токен для авторизации
   * @param {Function} messageHandler - Обработчик входящих сообщений
   */
  init(token, messageHandler) {
    this.token = token;
    
    if (messageHandler) {
      // Добавляем обработчик в массив, а не вызываем напрямую
      this.messageHandlers.push(messageHandler);
    }
  }

  /**
   * Установка соединения WebSocket
   */
  connect() {
    // Проверяем, есть ли у нас токен
    if (!this.token) {
      console.error('WebSocket: токен не предоставлен');
      return;
    }

    // Если соединение уже установлено, не устанавливаем новое
    if (this.isConnected && this.socket) {
      return;
    }

    try {
      // Создаем URL для WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;  // Всегда используем текущий хост
      
      const wsUrl = `${protocol}//${host}/api/ws`;
      console.log(`WebSocket: подключение к ${wsUrl}`);

      // Создаем новый WebSocket
      this.socket = new WebSocket(wsUrl);
      
      // После подключения отправляем токен
      this.socket.onopen = () => {
        console.log('WebSocket: соединение открыто, отправляем токен аутентификации');
        
        // Отправляем токен в первом сообщении
        this.socket.send(JSON.stringify({
          type: 'auth',
          content: {
            token: this.token
          }
        }));
        
        this.handleOpen();
      };
      
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);

      console.log('WebSocket: попытка соединения...');
    } catch (error) {
      console.error('WebSocket: ошибка при создании соединения', error);
    }
  }

  /**
   * Закрытие соединения WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;

      // Очищаем таймер переподключения
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      console.log('WebSocket: соединение закрыто');
    }
  }

  /**
   * Отправка сообщения через WebSocket
   * @param {Object} message - Сообщение для отправки
   * @returns {boolean} Успешно ли отправлено сообщение
   */
  sendMessage(message) {
    if (!this.isConnected || !this.socket) {
      console.error('WebSocket: нет соединения для отправки сообщения');
      return false;
    }

    try {
      // Преобразуем сообщение в JSON строку
      const messageStr = JSON.stringify(message);
      console.log('WebSocket: отправка сообщения', message);
      this.socket.send(messageStr);
      return true;
    } catch (error) {
      console.error('WebSocket: ошибка отправки сообщения', error);
      return false;
    }
  }

  /**
   * Добавление обработчика для входящих сообщений
   * @param {Function} handler - Функция обработчик
   */
  onMessage(handler) {
    if (typeof handler === 'function') {
      this.messageHandlers.push(handler);
    }
  }

  /**
   * Добавление обработчика для события соединения
   * @param {Function} handler - Функция обработчик
   */
  onConnect(handler) {
    if (typeof handler === 'function') {
      this.connectHandlers.push(handler);
    }
  }

  /**
   * Добавление обработчика для события отключения
   * @param {Function} handler - Функция обработчик
   */
  onDisconnect(handler) {
    if (typeof handler === 'function') {
      this.disconnectHandlers.push(handler);
    }
  }

  /**
   * Обработчик события открытия соединения
   * @private
   */
  handleOpen() {
    console.log('WebSocket: соединение установлено');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Запускаем обработчики соединения
    this.connectHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('WebSocket: ошибка в обработчике соединения', error);
      }
    });
  }

  /**
   * Обработчик события закрытия соединения
   * @private
   */
  handleClose(event) {
    console.log(`WebSocket: соединение закрыто с кодом ${event.code}`);
    this.isConnected = false;

    // Запускаем обработчики отключения
    this.disconnectHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('WebSocket: ошибка в обработчике отключения', error);
      }
    });

    // Автоматическое переподключение
    this.scheduleReconnect();
  }

  /**
   * Обработчик ошибок WebSocket
   * @private
   */
  handleError(error) {
    console.error('WebSocket: ошибка', error);
  }

  /**
   * Обработчик входящих сообщений
   * @private
   */
  handleMessage(event) {
    try {
      // Парсим полученное сообщение
      console.log('WebSocket: получено сообщение', event.data);
      const message = JSON.parse(event.data);
      
      // Запускаем все обработчики сообщений
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('WebSocket: ошибка в обработчике сообщений', error);
        }
      });
    } catch (error) {
      console.error('WebSocket: ошибка разбора сообщения', error, event.data);
    }
  }

  /**
   * Планирование переподключения
   * @private
   */
  scheduleReconnect() {
    // Если уже есть активный таймер, не создаем новый
    if (this.reconnectTimer) {
      return;
    }

    // Если превышено максимальное количество попыток, останавливаемся
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocket: превышено максимальное количество попыток переподключения');
      return;
    }

    // Увеличиваем количество попыток и запускаем таймер
    this.reconnectAttempts++;
    
    console.log(`WebSocket: запланировано переподключение (попытка ${this.reconnectAttempts} из ${this.maxReconnectAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }
}

// Создаем и экспортируем экземпляр сервиса
const websocketService = new WebSocketService();
export default websocketService;
