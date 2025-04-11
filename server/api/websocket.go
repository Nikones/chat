package api

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"messenger/logger"
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
}

// WSMessage представляет сообщение WebSocket
type WSMessage struct {
	Type    string          `json:"type"`
	Content json.RawMessage `json:"content"`
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

// WebSocketHandler обрабатывает WebSocket соединения
func (s *Server) WebSocketHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Требуется авторизация"})
		return
	}

	// Обновляем соединение до WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
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
	}

	// Сохраняем клиента в карте соединений
	s.wsClients.Store(userID, client)

	// Запускаем горутины для чтения и записи
	go client.writePump()
	go client.readPump()

	logger.Infof("Пользователь %d подключен по WebSocket", userID)
}

// readPump читает сообщения от клиента
func (c *WSClient) readPump() {
	defer func() {
		c.server.wsClients.Delete(c.userID)
		c.conn.Close()
		logger.Infof("Пользователь %d отключен от WebSocket", c.userID)
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Errorf("Ошибка чтения WebSocket: %v", err)
			}
			break
		}

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
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Канал закрыт
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Добавляем все ожидающие сообщения в текущую отправку
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// processMessage обрабатывает входящее сообщение
func (c *WSClient) processMessage(msg []byte) {
	var wsMsg wsMessage
	if err := json.Unmarshal(msg, &wsMsg); err != nil {
		c.sendError("Некорректный формат сообщения")
		return
	}

	switch wsMsg.Type {
	case WSTypeMessage:
		var payload wsNewMessagePayload
		if err := json.Unmarshal(wsMsg.Payload, &payload); err != nil {
			c.sendError("Некорректный формат данных сообщения")
			return
		}

		// Проверка доступа к чату
		if !c.server.db.IsUserInChat(c.userID, payload.ChatID) {
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
