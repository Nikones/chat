package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"messenger/logger"
	"messenger/middleware"
	"messenger/models"
	"messenger/utils/crypto"
)

// Константы для WebSocket
const (
	// Время для записи/чтения сообщений
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10

	// Максимальный размер сообщения
	maxMessageSize = 10 * 1024 // 10KB

	// Типы сообщений WebSocket
	WSTypeMessage = "message"
	WSTypeTyping  = "typing"
	WSTypeRead    = "read"
	WSTypeError   = "error"
	WSTypeDebug   = "debug" // Добавляем тип сообщения для отладки
)

// Client представляет WebSocket клиента (для обратной совместимости)
type Client struct {
	server        *Server
	conn          *websocket.Conn
	send          chan []byte
	userID        uint
	authenticated bool
	mu            sync.Mutex
}

// WSClient представляет WebSocket клиента
type WSClient struct {
	server        *Server
	conn          *websocket.Conn
	send          chan []byte
	userID        uint
	authenticated bool
	mu            sync.Mutex
	clientInfo    string // Добавляем информацию о клиенте для логирования
}

// WSMessage представляет сообщение WebSocket
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// wsMessage представляет входящее сообщение от клиента
type wsMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// wsResponse представляет исходящее сообщение к клиенту
type wsResponse struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Структуры для разных типов сообщений
type wsNewMessagePayload struct {
	ChatID  uint   `json:"chatId"`
	Content string `json:"content"`
	Type    string `json:"type"`
}

type typingPayload struct {
	ChatID uint `json:"chatId"`
	Status bool `json:"status"`
}

type readPayload struct {
	MessageID uint `json:"messageId"`
}

// ReadReceiptPayload представляет данные о прочтении сообщений
type ReadReceiptPayload struct {
	ChatID    uint        `json:"chat_id"`
	UserID    interface{} `json:"user_id"`
	Timestamp time.Time   `json:"timestamp"`
}

// debugPayload представляет информацию для отладки
type debugPayload struct {
	ClientInfo  map[string]interface{} `json:"client_info"`
	UserID      string                 `json:"user_id"`
	Timestamp   time.Time              `json:"timestamp"`
	MessageData interface{}            `json:"message_data"`
}

// errorPayload представляет структуру данных для сообщений об ошибках
type errorPayload struct {
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// WebSocketHandler обрабатывает WebSocket соединения
func (s *Server) WebSocketHandler(c *gin.Context) {
	// Получаем токен из различных источников
	tokenString := c.Query("token")

	// Добавляем расширенное логирование заголовков
	headers := c.Request.Header
	logger.Debugf("WebSocketHandler: Заголовки запроса: %+v", headers)

	// Если токен не найден в URL, проверяем в заголовке Sec-WebSocket-Protocol
	if tokenString == "" {
		// Проверяем токен в заголовке Sec-WebSocket-Protocol
		if protocols := c.GetHeader("Sec-WebSocket-Protocol"); protocols != "" {
			logger.Debugf("Получены протоколы WebSocket: %s", protocols)
			tokenParts := strings.Split(protocols, ", ")
			for _, part := range tokenParts {
				if strings.HasPrefix(part, "token=") {
					tokenString = strings.TrimPrefix(part, "token=")
					logger.Debugf("Найден токен в протоколе: %s...", tokenString[:10])
					break
				} else {
					// Проверяем, может быть сам протокол является токеном
					logger.Debugf("Проверяем протокол как потенциальный токен: %s", part)
					// Сохраняем часть как потенциальный токен
					if tokenString == "" {
						tokenString = part
						logger.Debugf("Используем протокол как токен: %s...", part[:10])
					}
				}
			}
		}
	}

	// Проверяем заголовок Authorization, если токен всё еще не найден
	if tokenString == "" {
		if authHeader := c.GetHeader("Authorization"); authHeader != "" {
			logger.Debugf("Найден заголовок Authorization: %s", authHeader)
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = strings.TrimPrefix(authHeader, "Bearer ")
				logger.Debugf("Извлечен токен из заголовка Authorization: %s...", tokenString[:10])
			}
		}
	}

	// Если токен все еще не найден
	if tokenString == "" {
		logger.Warn("WebSocketHandler: Запрос без токена")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Требуется токен авторизации"})
		return
	}

	// Вместо установки заголовка Authorization для JWTAuth middleware,
	// напрямую проверяем токен здесь, так как маршрут теперь публичный
	claims, err := middleware.ValidateToken(tokenString, s.config.JWT.Secret)
	if err != nil {
		logger.Warnf("WebSocketHandler: Недействительный токен: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Недействительный токен авторизации"})
		return
	}

	// Получаем userID из проверенных claims
	userID := claims.UserID
	logger.Infof("WebSocketHandler: Успешная аутентификация пользователя %d", userID)

	// Настраиваем upgrader для текущего запроса
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		// Отключаем проверку происхождения для отладки
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			logger.Debugf("WebSocketHandler: Проверка Origin: %s", origin)
			return true // Разрешаем любой Origin для отладки
		},
	}

	// Собираем информацию о клиенте для логирования
	clientInfo := c.ClientIP() + " - " + c.Request.UserAgent()
	logger.Debugf("WebSocketHandler: Информация о клиенте: %s", clientInfo)

	// Обновляем соединение до WebSocket с указанием подпротоколов
	protocols := strings.Split(c.GetHeader("Sec-WebSocket-Protocol"), ", ")
	logger.Debugf("WebSocketHandler: Запрошенные протоколы: %v", protocols)

	responseHeader := http.Header{}
	// Если есть запрошенные протоколы, устанавливаем первый из них
	if len(protocols) > 0 && protocols[0] != "" {
		responseHeader.Set("Sec-WebSocket-Protocol", protocols[0])
		logger.Debugf("WebSocketHandler: Устанавливаем протокол в ответе: %s", protocols[0])
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, responseHeader)
	if err != nil {
		logger.Errorf("Ошибка обновления соединения до WebSocket: %v", err)
		return
	}

	// Создаем клиента
	client := &WSClient{
		server:        s,
		conn:          conn,
		send:          make(chan []byte, 256),
		userID:        userID,
		authenticated: true,
		clientInfo:    clientInfo,
	}

	// Сохраняем клиента в карте соединений
	s.wsClients.Store(userID, client)

	// Отправляем диагностическое сообщение клиенту
	debugMsg := wsResponse{
		Type: WSTypeDebug,
		Payload: debugPayload{
			ClientInfo: map[string]interface{}{
				"ip":           clientInfo,
				"join_time":    time.Now(),
				"session_time": time.Since(time.Now()).String(),
			},
			UserID:      clientInfo,
			Timestamp:   time.Now(),
			MessageData: "WebSocket соединение установлено успешно",
		},
	}
	debugJSON, _ := json.Marshal(debugMsg)
	client.send <- debugJSON

	// Запускаем горутины для чтения и записи
	go client.writePump()
	go client.readPump()

	logger.Infof("Пользователь %d подключен по WebSocket (клиент: %s)", userID, clientInfo)
}

// readPump читает сообщения от клиента
func (c *WSClient) readPump() {
	defer func() {
		c.server.wsClients.Delete(c.userID)
		c.conn.Close()
		logger.Infof("Пользователь %d отключен от WebSocket (клиент: %s)", c.userID, c.clientInfo)
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		logger.Debugf("WebSocket: Получен PONG от пользователя %d (клиент: %s)", c.userID, c.clientInfo)
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Errorf("Ошибка чтения WebSocket от пользователя %d (клиент: %s): %v", c.userID, c.clientInfo, err)
			} else {
				logger.Infof("WebSocket соединение закрыто для пользователя %d (клиент: %s): %v", c.userID, c.clientInfo, err)
			}
			break
		}

		// Логируем полученное сообщение
		logger.Debugf("WebSocket: Получено сообщение от пользователя %d (клиент: %s): %s", c.userID, c.clientInfo, string(message))

		// Обрабатываем полученное сообщение
		c.processMessage(message)
	}
}

// writePump отправляет сообщения клиенту
func (c *WSClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
		logger.Debugf("WebSocket: Закрыт канал отправки для пользователя %d (клиент: %s)", c.userID, c.clientInfo)
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Канал закрыт
				logger.Debugf("WebSocket: Канал отправки закрыт для пользователя %d (клиент: %s)", c.userID, c.clientInfo)
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				logger.Errorf("WebSocket: Ошибка получения writer для пользователя %d (клиент: %s): %v", c.userID, c.clientInfo, err)
				return
			}

			// Логируем отправляемое сообщение
			logger.Debugf("WebSocket: Отправка сообщения пользователю %d (клиент: %s): %s", c.userID, c.clientInfo, string(message))

			w.Write(message)

			// Добавляем все ожидающие сообщения в текущую отправку
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				msg := <-c.send
				logger.Debugf("WebSocket: Добавление в пакет сообщения для пользователя %d (клиент: %s): %s", c.userID, c.clientInfo, string(msg))
				w.Write(msg)
			}

			if err := w.Close(); err != nil {
				logger.Errorf("WebSocket: Ошибка закрытия writer для пользователя %d (клиент: %s): %v", c.userID, c.clientInfo, err)
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			logger.Debugf("WebSocket: Отправка PING пользователю %d (клиент: %s)", c.userID, c.clientInfo)
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				logger.Errorf("WebSocket: Ошибка отправки PING пользователю %d (клиент: %s): %v", c.userID, c.clientInfo, err)
				return
			}
		}
	}
}

// processMessage обрабатывает входящее сообщение
func (c *WSClient) processMessage(msg []byte) {
	var wsMsg wsMessage
	if err := json.Unmarshal(msg, &wsMsg); err != nil {
		logger.Errorf("WebSocket: Ошибка разбора JSON от пользователя %d (клиент: %s): %v", c.userID, c.clientInfo, err)
		c.sendError("Некорректный формат сообщения")
		return
	}

	logger.Debugf("WebSocket: Обработка сообщения типа '%s' от пользователя %d (клиент: %s)", wsMsg.Type, c.userID, c.clientInfo)

	switch wsMsg.Type {
	case WSTypeMessage:
		var payload wsNewMessagePayload
		if err := json.Unmarshal(wsMsg.Payload, &payload); err != nil {
			logger.Errorf("WebSocket: Ошибка разбора payload для сообщения от пользователя %d (клиент: %s): %v", c.userID, c.clientInfo, err)
			c.sendError("Некорректный формат данных сообщения")
			return
		}

		// Проверка доступа к чату
		if !c.server.db.IsUserInChat(c.userID, payload.ChatID) {
			logger.Warnf("WebSocket: Попытка доступа к чату %d от пользователя %d (клиент: %s) запрещена", payload.ChatID, c.userID, c.clientInfo)
			c.sendError("Доступ к чату запрещен")
			return
		}

		// Обработка нового сообщения через функцию в messages.go
		c.processNewMessage(payload)

	case WSTypeTyping:
		var payload typingPayload
		if err := json.Unmarshal(wsMsg.Payload, &payload); err != nil {
			c.sendError("Некорректный формат данных о наборе текста")
			return
		}

		// Проверка доступа к чату
		if !c.server.db.IsUserInChat(c.userID, payload.ChatID) {
			c.sendError("Доступ к чату запрещен")
			return
		}

		// Отправляем статус печати всем участникам чата кроме текущего
		c.server.broadcastTypingStatus(c.userID, payload.ChatID, payload.Status)

	case WSTypeRead:
		var payload readPayload
		if err := json.Unmarshal(wsMsg.Payload, &payload); err != nil {
			c.sendError("Некорректный формат данных о прочтении")
			return
		}

		// Отмечаем сообщение как прочитанное
		if err := c.server.db.MarkMessageAsRead(payload.MessageID, c.userID); err != nil {
			c.sendError("Ошибка при отметке сообщения как прочитанного")
			return
		}

		// Получаем сообщение для проверки чата
		message, err := c.server.db.GetMessageByID(payload.MessageID)
		if err != nil {
			c.sendError("Сообщение не найдено")
			return
		}

		// Проверка доступа к чату
		if !c.server.db.IsUserInChat(c.userID, message.ChatID) {
			c.sendError("Доступ к чату запрещен")
			return
		}

		// Отправляем статус прочтения всем участникам чата
		c.server.broadcastReadStatus(c.userID, message)
	}
}

// processNewMessage обрабатывает новое сообщение из WebSocket
func (c *WSClient) processNewMessage(payload wsNewMessagePayload) {
	// Получаем информацию о чате
	chat, err := c.server.db.GetChatByID(payload.ChatID)
	if err != nil {
		c.sendError("Чат не найден")
		return
	}

	// Получаем информацию о пользователе
	user, err := c.server.db.GetUserByID(c.userID)
	if err != nil {
		c.sendError("Ошибка получения данных пользователя")
		return
	}

	// Шифруем содержимое сообщения
	encryptedContent, err := crypto.Encrypt([]byte(payload.Content))
	if err != nil {
		c.sendError("Ошибка шифрования сообщения")
		return
	}

	// Создаем новое сообщение
	message := models.Message{
		ChatID:    payload.ChatID,
		UserID:    c.userID,
		Content:   encryptedContent,
		Type:      payload.Type,
		PlainText: payload.Content, // Для ответа клиенту
	}

	// Сохраняем сообщение в базе данных
	if err := c.server.db.CreateMessage(&message); err != nil {
		c.sendError("Ошибка сохранения сообщения")
		return
	}

	// Обновляем время последней активности чата
	chat.LastActivity = time.Now()
	if err := c.server.db.UpdateChat(chat); err != nil {
		logger.Errorf("Ошибка обновления времени активности чата: %v", err)
	}

	// Формируем ответное сообщение
	msgResponse := messageResponse{
		ID:        message.ID,
		ChatID:    message.ChatID,
		UserID:    message.UserID,
		Content:   payload.Content, // Отправляем открытый текст в ответе
		Type:      message.Type,
		CreatedAt: message.CreatedAt,
	}

	// Добавляем информацию о пользователе
	msgResponse.User.ID = user.ID
	msgResponse.User.Username = user.Username
	msgResponse.User.Avatar = user.Avatar

	// Отправляем сообщение текущему пользователю
	c.sendResponse(WSTypeMessage, msgResponse)

	// Отправляем сообщение другим участникам чата
	c.broadcastMessageToChat(payload.ChatID, msgResponse)
}

// sendResponse отправляет ответ клиенту
func (c *WSClient) sendResponse(msgType string, payload interface{}) {
	response := wsResponse{
		Type:    msgType,
		Payload: payload,
	}

	data, err := json.Marshal(response)
	if err != nil {
		logger.Errorf("Ошибка маршалинга ответа: %v", err)
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	select {
	case c.send <- data:
		// Успешно отправлено в канал
	default:
		// Буфер полон, закрываем соединение
		c.server.wsClients.Delete(c.userID)
		close(c.send)
		logger.Warnf("Клиент %d отключен: буфер полон", c.userID)
	}
}

// sendError отправляет сообщение об ошибке клиенту
func (c *WSClient) sendError(message string) {
	c.sendResponse(WSTypeError, gin.H{"message": message})
}

// broadcastTypingStatus отправляет статус набора текста всем участникам чата
func (s *Server) broadcastTypingStatus(senderID, chatID uint, status bool) {
	// Получаем всех участников чата
	users, err := s.db.GetChatUsers(chatID)
	if err != nil {
		logger.Errorf("Ошибка получения участников чата: %v", err)
		return
	}

	// Данные о наборе текста
	typingData := gin.H{
		"user_id": senderID,
		"chat_id": chatID,
		"status":  status,
	}

	// Отправляем статус каждому участнику чата кроме отправителя
	for _, user := range users {
		if user.ID == senderID {
			continue
		}

		// Получаем WebSocket клиента для пользователя
		if clientObj, ok := s.wsClients.Load(user.ID); ok {
			if client, ok := clientObj.(*WSClient); ok {
				client.sendResponse(WSTypeTyping, typingData)
			}
		}
	}
}

// broadcastMessageToChat отправляет сообщение всем участникам чата кроме отправителя
func (c *WSClient) broadcastMessageToChat(chatID uint, message messageResponse) {
	// Получаем всех участников чата
	users, err := c.server.db.GetChatUsers(chatID)
	if err != nil {
		logger.Errorf("Ошибка получения участников чата: %v", err)
		return
	}

	// Отправляем сообщение каждому участнику чата кроме отправителя
	for _, user := range users {
		if user.ID == c.userID {
			continue
		}

		// Получаем WebSocket клиента для пользователя
		if clientObj, ok := c.server.wsClients.Load(user.ID); ok {
			if client, ok := clientObj.(*WSClient); ok {
				client.sendResponse(WSTypeMessage, message)
			}
		}
	}
}

// broadcastReadStatus отправляет статус прочтения сообщения
func (s *Server) broadcastReadStatus(userID uint, message *models.Message) {
	// Данные о прочтении
	readData := gin.H{
		"user_id":    userID,
		"message_id": message.ID,
		"chat_id":    message.ChatID,
	}

	// Получаем всех участников чата
	users, err := s.db.GetChatUsers(message.ChatID)
	if err != nil {
		logger.Errorf("Ошибка получения участников чата: %v", err)
		return
	}

	// Отправляем статус каждому участнику чата
	for _, user := range users {
		// Получаем WebSocket клиента для пользователя
		if clientObj, ok := s.wsClients.Load(user.ID); ok {
			if client, ok := clientObj.(*WSClient); ok {
				client.sendResponse(WSTypeRead, readData)
			}
		}
	}
}

// sendDebugMessage отправляет отладочное сообщение клиенту
func (c *WSClient) sendDebugMessage(data interface{}) {
	log.Printf("WebSocket: Отправка отладочного сообщения клиенту user_id=%d, ip=%s", c.userID, c.clientInfo)

	payload := debugPayload{
		ClientInfo: map[string]interface{}{
			"ip":           c.clientInfo,
			"join_time":    c.conn.LocalAddr().String(),
			"session_time": "0s", // При первом соединении
		},
		UserID:      fmt.Sprintf("%d", c.userID),
		Timestamp:   time.Now(),
		MessageData: data,
	}

	msg := WSMessage{
		Type:    WSTypeDebug,
		Payload: payload,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WebSocket: Ошибка при формировании JSON отладочного сообщения: %v", err)
		return
	}

	c.send <- msgBytes
}

// maskToken маскирует токен для безопасного отображения в логах
func maskToken(token string) string {
	if token == "" {
		return "<пусто>"
	}
	if len(token) <= 8 {
		return "****"
	}
	return token[:4] + "..." + token[len(token)-4:]
}

// getUserIP получает IP-адрес пользователя из заголовков запроса
func getUserIP(r *http.Request) string {
	// Проверяем заголовки X-Forwarded-For или X-Real-IP
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.Split(ip, ", ")[0]
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	// Иначе берем RemoteAddr из запроса
	return strings.Split(r.RemoteAddr, ":")[0]
}

// sendErrorMessage отправляет сообщение об ошибке клиенту
func (c *WSClient) sendErrorMessage(message string) {
	log.Printf("WebSocket: Отправка сообщения об ошибке клиенту user_id=%d, ip=%s: %s",
		c.userID, c.clientInfo, message)

	payload := errorPayload{
		Code:    400, // используем код по умолчанию
		Message: message,
	}

	msg := WSMessage{
		Type:    WSTypeError,
		Payload: payload,
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WebSocket: Ошибка при формировании JSON сообщения об ошибке: %v", err)
		return
	}

	c.send <- msgBytes
}
