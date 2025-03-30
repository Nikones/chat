package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"messenger/server/config"
	"messenger/server/database"
	"messenger/server/middleware"
	"messenger/server/models"
)

// Сервер API
type Server struct {
	router *gin.Engine
	config *config.Config
	db     *database.Database

	// Управление клиентами WebSocket
	clients map[uint]*Client
	mu      sync.Mutex
}

// Создание нового сервера
func NewServer(cfg *config.Config, db *database.Database) *Server {
	router := gin.Default()

	server := &Server{
		router:  router,
		config:  cfg,
		db:      db,
		clients: make(map[uint]*Client),
	}

	// Настройка middleware
	router.Use(middleware.CORS())

	// Защита от брутфорса
	authLimiter := middleware.NewAuthLimiter(5, 15*time.Minute, 30*time.Minute)
	router.Use(authLimiter.Middleware())
	// Запускаем периодическую очистку устаревших блокировок
	authLimiter.Cleanup(1 * time.Hour)

	// Настройка маршрутов
	server.setupRoutes()

	return server
}

// Настройка маршрутов API
func (s *Server) setupRoutes() {
	// Публичные маршруты
	public := s.router.Group("/api")
	{
		// Авторизация
		public.POST("/login", s.handleLogin)

		// Проверка инициализации и первоначальная настройка
		public.GET("/system/initialized", s.handleCheckInitialized)
		public.POST("/system/setup", s.handleInitialSetup)

		// Добавляем маршрут для сброса системы (для разработки)
		public.GET("/system/reset", s.handleResetSystem)
	}

	// Защищенные маршруты
	auth := s.router.Group("/api")
	auth.Use(middleware.JWTAuth(s.config.JWT.Secret))
	{
		// Проверка аутентификации
		auth.GET("/auth/check", s.handleAuthCheck)

		// Пользователи (только админ)
		auth.GET("/users", s.handleGetUsers)
		auth.POST("/users", s.handleCreateUser)

		// Список пользователей для чата (доступно всем авторизованным)
		auth.GET("/chat/users", s.handleGetChatUsers)

		// Сообщения
		auth.GET("/messages/:user_id", s.handleGetMessages)
		auth.POST("/messages", s.handleSendMessage)

		// WebSocket для чата и звонков
		auth.GET("/ws", s.handleWebSocket)
	}
}

// Запуск сервера
func (s *Server) Run() error {
	addr := fmt.Sprintf("%s:%s", s.config.Server.Host, s.config.Server.Port)
	log.Printf("Сервер запущен на %s", addr)
	return s.router.Run(addr)
}

// Регистрация клиента
func (s *Server) registerClient(client *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Если уже есть клиент с тем же ID, закрываем его
	if existing, ok := s.clients[client.userID]; ok {
		close(existing.send)
	}

	s.clients[client.userID] = client
	log.Printf("Клиент зарегистрирован: пользователь %d", client.userID)
}

// Отмена регистрации клиента
func (s *Server) unregisterClient(client *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.clients[client.userID]; ok {
		if existing == client {
			delete(s.clients, client.userID)
			close(client.send)
			log.Printf("Клиент отключен: пользователь %d", client.userID)
		}
	}
}

// Обработка входящего сообщения
func (s *Server) processMessage(c *Client, data []byte) {
	var msg WSMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Ошибка разбора сообщения: %v", err)
		return
	}

	switch msg.Type {
	case "text":
		var textMsg TextMessage
		if err := json.Unmarshal(msg.Content, &textMsg); err != nil {
			log.Printf("Ошибка разбора текстового сообщения: %v", err)
			return
		}

		// Сохраняем сообщение в БД
		message := models.Message{
			SenderID:    c.userID,
			RecipientID: textMsg.RecipientID,
			Content:     textMsg.Content,
			IsRead:      false,
		}

		if err := s.db.DB.Create(&message).Error; err != nil {
			log.Printf("Ошибка сохранения сообщения: %v", err)
			return
		}

		// Отправляем сообщение получателю
		s.sendToUser(textMsg.RecipientID, data)

	case "call_offer":
		var offerMsg CallOfferMessage
		if err := json.Unmarshal(msg.Content, &offerMsg); err != nil {
			log.Printf("Ошибка разбора предложения звонка: %v", err)
			return
		}

		s.sendToUser(offerMsg.RecipientID, data)

	case "call_answer":
		var answerMsg CallAnswerMessage
		if err := json.Unmarshal(msg.Content, &answerMsg); err != nil {
			log.Printf("Ошибка разбора ответа на звонок: %v", err)
			return
		}

		s.sendToUser(answerMsg.RecipientID, data)

	case "ice_candidate":
		var iceMsg ICECandidateMessage
		if err := json.Unmarshal(msg.Content, &iceMsg); err != nil {
			log.Printf("Ошибка разбора ICE кандидата: %v", err)
			return
		}

		s.sendToUser(iceMsg.RecipientID, data)

	default:
		log.Printf("Неизвестный тип сообщения: %s", msg.Type)
	}
}

// Отправка сообщения конкретному пользователю
func (s *Server) sendToUser(userID uint, message []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if client, ok := s.clients[userID]; ok {
		select {
		case client.send <- message:
			// Сообщение отправлено
		default:
			// Канал заполнен, отключаем клиента
			close(client.send)
			delete(s.clients, userID)
		}
	}
}

// Получение сообщений между пользователями
func (s *Server) handleGetMessages(c *gin.Context) {
	userID, _ := c.Get("userID")
	otherUserID := c.Param("user_id")

	var messages []models.Message
	result := s.db.DB.Where(
		"(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
		userID, otherUserID, otherUserID, userID,
	).Order("created_at").Find(&messages)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения сообщений"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// Отправка истории сообщений при подключении
func (s *Server) sendMessageHistory(client *Client) {
	var messages []models.Message
	result := s.db.DB.Where(
		"recipient_id = ? AND is_read = ?",
		client.userID, false,
	).Find(&messages)

	if result.Error != nil {
		log.Printf("Ошибка получения непрочитанных сообщений: %v", result.Error)
		return
	}

	for _, msg := range messages {
		// Формируем сообщение в формате WebSocket
		wsMsg := WSMessage{
			Type: "text",
			Content: json.RawMessage(fmt.Sprintf(
				`{"recipient_id":%d,"content":%q}`,
				msg.RecipientID, msg.Content,
			)),
		}

		data, err := json.Marshal(wsMsg)
		if err != nil {
			log.Printf("Ошибка сериализации сообщения: %v", err)
			continue
		}

		// Отправляем клиенту
		select {
		case client.send <- data:
			// Помечаем как прочитанное
			s.db.DB.Model(&msg).Update("is_read", true)
		default:
			log.Printf("Канал клиента заполнен, не удалось отправить историю")
			return
		}
	}
}

// Обработчик сброса системы (только для разработки)
func (s *Server) handleResetSystem(c *gin.Context) {
	// Удаляем всех пользователей
	s.db.DB.Exec("DELETE FROM users")
	// Удаляем все сообщения
	s.db.DB.Exec("DELETE FROM messages")

	c.JSON(http.StatusOK, gin.H{
		"message":     "Система сброшена успешно",
		"initialized": false,
	})
}

// Определение структуры запроса для отправки сообщения
type SendMessageRequest struct {
	RecipientID uint   `json:"recipient_id" binding:"required"`
	Content     string `json:"content" binding:"required"`
}

// Обработчик отправки сообщения через HTTP
func (s *Server) handleSendMessage(c *gin.Context) {
	// Получаем ID отправителя из контекста аутентификации
	senderID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не авторизован"})
		return
	}

	// Парсим запрос
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
		return
	}

	// Сохраняем сообщение в БД
	message := models.Message{
		SenderID:    senderID.(uint),
		RecipientID: req.RecipientID,
		Content:     req.Content,
		IsRead:      false,
	}

	if err := s.db.DB.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения сообщения"})
		return
	}

	// Отправляем сообщение через WebSocket, если получатель онлайн
	wsMessage := WSMessage{
		Type: "text",
		Content: json.RawMessage(fmt.Sprintf(
			`{"sender_id":%d,"recipient_id":%d,"content":%q,"id":%d,"created_at":%q}`,
			message.SenderID, message.RecipientID, message.Content, message.ID, message.CreatedAt,
		)),
	}

	data, err := json.Marshal(wsMessage)
	if err != nil {
		log.Printf("Ошибка сериализации сообщения: %v", err)
	} else {
		s.sendToUser(req.RecipientID, data)
	}

	// Отвечаем успешным результатом с данными сообщения
	c.JSON(http.StatusOK, message)
}
