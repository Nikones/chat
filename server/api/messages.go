package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"messenger/logger"
	"messenger/models"
	"messenger/redis"
	"messenger/utils/crypto"
)

// Запрос на отправку сообщения
type SendMessageRequest struct {
	RecipientID uint   `json:"recipient_id" binding:"required"`
	Content     string `json:"content" binding:"required"`
}

// Запрос на отметку сообщений как прочитанных
type MarkReadRequest struct {
	SenderID uint `json:"sender_id" binding:"required"`
}

// Структура для создания нового сообщения
type newMessagePayload struct {
	ChatID  uint   `json:"chat_id"`
	Content string `json:"content"`
	Type    string `json:"type"`
	FileID  *uint  `json:"file_id,omitempty"`
}

// Структура для новых сообщений
type newMessageRequest struct {
	Content string `json:"content" binding:"required"`
	Type    string `json:"type" binding:"required,oneof=text file"`
	FileID  *uint  `json:"file_id,omitempty"`
}

// Структура для сообщений с сервера
type messageResponse struct {
	ID        uint         `json:"id"`
	ChatID    uint         `json:"chat_id"`
	UserID    uint         `json:"user_id"`
	Content   string       `json:"content"`
	Type      string       `json:"type"`
	FileID    *uint        `json:"file_id,omitempty"`
	File      *models.File `json:"file,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	User      struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Avatar   string `json:"avatar,omitempty"`
	} `json:"user"`
}

// handleGetMessages возвращает сообщения чата
func (s *Server) handleGetMessages(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Получаем ID чата из параметров URL
	chatIDStr := c.Param("chatID")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID чата"})
		return
	}

	// Проверяем доступ к чату
	if !s.db.IsUserInChat(userID, uint(chatID)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "У вас нет доступа к этому чату"})
		return
	}

	// Получаем сообщения чата
	limit := 50 // можно сделать параметром
	messages, err := s.db.GetChatMessages(uint(chatID), limit)
	if err != nil {
		logger.Errorf("Ошибка получения сообщений: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения сообщений"})
		return
	}

	// Преобразуем сообщения для ответа
	var response []messageResponse
	for _, msg := range messages {
		// Расшифровываем содержимое сообщения
		var content string
		if len(msg.Content) > 0 {
			plaintext, err := crypto.Decrypt(msg.Content)
			if err != nil {
				logger.Errorf("Ошибка расшифровки сообщения #%d: %v", msg.ID, err)
				content = "[Ошибка расшифровки]"
			} else {
				content = string(plaintext)
			}
		} else {
			content = msg.PlainText
		}

		// Создаем объект ответа
		msgResp := messageResponse{
			ID:        msg.ID,
			ChatID:    msg.ChatID,
			UserID:    msg.UserID,
			Content:   content,
			Type:      msg.Type,
			FileID:    msg.FileID,
			File:      msg.File,
			CreatedAt: msg.CreatedAt,
		}

		// Добавляем информацию о пользователе
		msgResp.User.ID = msg.User.ID
		msgResp.User.Username = msg.User.Username
		msgResp.User.Avatar = msg.User.Avatar

		response = append(response, msgResp)
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": response,
	})
}

// handleSendMessage отправляет новое сообщение в чат
func (s *Server) handleSendMessage(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Получаем ID чата из параметров URL
	chatIDStr := c.Param("chatID")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID чата"})
		return
	}

	// Проверяем доступ к чату
	if !s.db.IsUserInChat(userID, uint(chatID)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "У вас нет доступа к этому чату"})
		return
	}

	// Получаем данные сообщения из запроса
	var req newMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные сообщения"})
		return
	}

	// Получаем информацию о пользователе
	user, err := s.db.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных пользователя"})
		return
	}

	// Шифруем содержимое сообщения
	encryptedContent, err := crypto.Encrypt([]byte(req.Content))
	if err != nil {
		logger.Errorf("Ошибка шифрования сообщения: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка шифрования сообщения"})
		return
	}

	// Создаем новое сообщение
	message := models.Message{
		ChatID:    uint(chatID),
		UserID:    userID,
		Content:   encryptedContent,
		Type:      req.Type,
		FileID:    req.FileID,
		PlainText: req.Content, // Только для ответа, не сохраняется в БД
	}

	// Сохраняем сообщение в базе данных
	if err := s.db.CreateMessage(&message); err != nil {
		logger.Errorf("Ошибка создания сообщения: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания сообщения"})
		return
	}

	// Обновляем время последней активности чата
	chat, err := s.db.GetChatByID(uint(chatID))
	if err == nil && chat != nil {
		chat.LastActivity = time.Now()
		if err := s.db.UpdateChat(chat); err != nil {
			logger.Errorf("Ошибка обновления времени активности чата: %v", err)
		}
	}

	// Формируем ответ
	response := messageResponse{
		ID:        message.ID,
		ChatID:    message.ChatID,
		UserID:    message.UserID,
		Content:   req.Content, // Отправляем открытый текст в ответе
		Type:      message.Type,
		FileID:    message.FileID,
		File:      message.File,
		CreatedAt: message.CreatedAt,
	}

	// Добавляем информацию о пользователе
	response.User.ID = user.ID
	response.User.Username = user.Username
	response.User.Avatar = user.Avatar

	c.JSON(http.StatusCreated, gin.H{
		"message": response,
	})
}

// Обработчик отметки сообщений как прочитанных
func (s *Server) handleMarkMessagesAsRead(c *gin.Context) {
	// Получаем ID текущего пользователя из контекста аутентификации
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не авторизован"})
		return
	}

	// Парсим запрос
	var req MarkReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
		return
	}

	// Обновляем сообщения в БД
	if err := s.db.DB.Model(&models.Message{}).
		Where("sender_id = ? AND recipient_id = ? AND is_read = ?", req.SenderID, userID, false).
		Updates(map[string]interface{}{"is_read": true}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления статуса сообщений"})
		return
	}

	// Отправляем уведомление о прочтении через WebSocket
	// Формируем WebSocket сообщение
	wsMessage := WSMessage{
		Type: "read_receipt",
		Content: json.RawMessage(fmt.Sprintf(`{
			"reader_id": %d
		}`, userID)),
	}

	// Если включен Redis, отправляем уведомление через него
	if s.redis != nil && s.redis.IsEnabled() {
		// Создаем канал для личного чата
		channel := redis.CreatePrivateChatChannel(userID.(uint), req.SenderID)

		// Создаем сообщение для Redis
		redisMsg := redis.PubSubMessage{
			Type:        "read_receipt",
			RecipientID: req.SenderID,
			SenderID:    userID.(uint),
			Content:     []byte(fmt.Sprintf(`{"reader_id":%d}`, userID)),
		}

		// Публикуем сообщение
		if err := s.redis.PublishMessage(channel, redisMsg); err != nil {
			fmt.Printf("Ошибка публикации уведомления о прочтении в Redis: %v\n", err)
		}
	} else {
		// Если Redis не используется, отправляем через прямое WebSocket соединение
		s.mu.Lock()
		client, ok := s.clients[req.SenderID]
		s.mu.Unlock()

		if ok {
			// Сериализуем сообщение в JSON
			messageJSON, err := serializeWSMessage(wsMessage)
			if err != nil {
				fmt.Printf("Ошибка сериализации уведомления: %v\n", err)
			} else {
				// Отправляем уведомление отправителю
				client.send <- messageJSON
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// Функция для обработки новых сообщений от клиента
func (s *Server) handleNewMessage(c *gin.Context, conn *websocket.Conn, userID uint, msg wsMessage) {
	// Получаем информацию из payload
	var payload newMessagePayload

	// Конвертируем payload в нужный формат
	payloadData, err := json.Marshal(msg.Payload)
	if err != nil {
		s.sendWSError(conn, "invalid_payload", "Неверный формат данных")
		return
	}

	if err := json.Unmarshal(payloadData, &payload); err != nil {
		s.sendWSError(conn, "invalid_payload", "Неверный формат данных сообщения")
		return
	}

	// Проверяем обязательные поля
	if payload.ChatID == 0 || payload.Content == "" {
		s.sendWSError(conn, "invalid_payload", "Отсутствуют обязательные поля")
		return
	}

	// Проверяем доступ пользователя к чату
	chat, err := s.db.GetChatByID(payload.ChatID)
	if err != nil {
		s.sendWSError(conn, "chat_not_found", "Чат не найден")
		return
	}

	// Проверяем, является ли пользователь участником чата
	if !s.db.IsUserInChat(userID, chat.ID) {
		s.sendWSError(conn, "access_denied", "Вы не являетесь участником этого чата")
		return
	}

	// Шифруем содержимое сообщения перед сохранением
	encryptedContent, err := crypto.Encrypt([]byte(payload.Content))
	if err != nil {
		s.sendWSError(conn, "encryption_error", "Ошибка шифрования сообщения")
		return
	}

	// Создаем новое сообщение
	message := &models.Message{
		ChatID:    payload.ChatID,
		UserID:    userID,
		Content:   encryptedContent, // Сохраняем шифрованное содержимое
		PlainText: payload.Content,  // Временно храним расшифрованный текст
		Type:      payload.Type,
		FileID:    payload.FileID,
		CreatedAt: time.Now(),
	}

	// Сохраняем сообщение в БД
	if err := s.db.CreateMessage(message); err != nil {
		s.sendWSError(conn, "db_error", "Ошибка сохранения сообщения")
		return
	}

	// Обновляем last_message и last_activity в чате
	chat.LastActivity = time.Now()
	s.db.UpdateChat(chat)

	// Подготавливаем данные пользователя для отправки
	user, err := s.db.GetUserByID(userID)
	if err == nil {
		message.User = *user
	}

	// Отправляем сообщение текущему пользователю для подтверждения
	s.sendWSResponse(conn, "message_sent", message)

	// Отправляем сообщение всем участникам чата
	s.broadcastMessageToChat(payload.ChatID, userID, message)
}

// Функция для отправки сообщения всем участникам чата
func (s *Server) broadcastMessageToChat(chatID, senderID uint, message *models.Message) {
	// Получаем список пользователей чата
	chatUsers, err := s.db.GetChatUsers(chatID)
	if err != nil {
		return
	}

	// Отправляем сообщение каждому участнику чата, кроме отправителя
	for _, user := range chatUsers {
		if user.ID == senderID {
			continue // Пропускаем отправителя
		}

		// Проверяем, подключен ли пользователь
		s.wsClients.Range(func(k, v interface{}) bool {
			clientUserID, ok := k.(uint)
			if !ok {
				return true // Продолжаем перебор
			}

			if clientUserID == user.ID {
				conn, ok := v.(*websocket.Conn)
				if ok {
					// Отправляем уведомление о новом сообщении
					s.sendWSResponse(conn, "new_message", message)
				}
			}
			return true
		})
	}
}

// Сериализация WebSocket сообщения в JSON
func serializeWSMessage(message interface{}) ([]byte, error) {
	return json.Marshal(message)
}

// Отправка ошибки через WebSocket
func (s *Server) sendWSError(conn *websocket.Conn, code string, message string) error {
	response := map[string]interface{}{
		"type": "error",
		"payload": map[string]string{
			"code":    code,
			"message": message,
		},
	}

	data, err := json.Marshal(response)
	if err != nil {
		return err
	}

	return conn.WriteMessage(websocket.TextMessage, data)
}

// Отправка ответа через WebSocket
func (s *Server) sendWSResponse(conn *websocket.Conn, msgType string, payload interface{}) error {
	response := map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	}

	data, err := json.Marshal(response)
	if err != nil {
		return err
	}

	return conn.WriteMessage(websocket.TextMessage, data)
}
