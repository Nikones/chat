package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	
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
		
		// Сообщения
		auth.GET("/messages/:user_id", s.handleGetMessages)
		
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
		
		if err := s.db.Create(&message).Error; err != nil {
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
	result := s.db.Where(
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
	result := s.db.Where(
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
			s.db.Model(&msg).Update("is_read", true)
		default:
			log.Printf("Канал клиента заполнен, не удалось отправить историю")
			return
		}
	}
}
