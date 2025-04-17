package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"messenger/logger"
	"messenger/models"
	"messenger/utils/crypto"
)

// Структура для представления чата в ответе API
type chatResponse struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	Type         string    `json:"type"`
	CreatedAt    time.Time `json:"created_at"`
	LastActivity time.Time `json:"last_activity"`
	Users        []struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Avatar   string `json:"avatar,omitempty"`
	} `json:"users"`
	LastMessage *struct {
		ID        uint      `json:"id"`
		Content   string    `json:"content"`
		Type      string    `json:"type"`
		CreatedAt time.Time `json:"created_at"`
		User      struct {
			ID       uint   `json:"id"`
			Username string `json:"username"`
		} `json:"user"`
	} `json:"last_message,omitempty"`
	UnreadCount int `json:"unread_count"`
}

// Структура запроса для создания чата
type createChatRequest struct {
	Type    string `json:"type" binding:"required,oneof=direct group"`
	Name    string `json:"name"`                        // Для групповых чатов
	UserIDs []uint `json:"user_ids" binding:"required"` // Для личных чатов (1 ID), для групповых (>=1 ID)
}

// handleGetChats возвращает список чатов пользователя
func (s *Server) handleGetChats(c *gin.Context) {
	// Получаем ID текущего пользователя из контекста (установлен middleware аутентификации)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не авторизован"})
		return
	}

	// Приводим userID к типу uint
	userIDUint, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат ID пользователя"})
		return
	}

	// Получаем список чатов из базы данных
	// TODO: Реализовать метод GetUserChats в Database
	var chats []models.Chat
	result := s.db.DB.Preload("Users").
		Joins("JOIN chat_users ON chat_users.chat_id = chats.id").
		Where("chat_users.user_id = ?", userIDUint).
		Find(&chats)

	if result.Error != nil {
		logger.Errorf("Ошибка получения чатов пользователя: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения чатов"})
		return
	}

	// Формируем ответ API
	response := make([]chatResponse, 0, len(chats))
	for _, chat := range chats {
		// Создаем базовый ответ о чате
		chatResp := chatResponse{
			ID:           chat.ID,
			Name:         chat.Name,
			Type:         chat.Type,
			CreatedAt:    chat.CreatedAt,
			LastActivity: chat.LastActivity,
			Users: make([]struct {
				ID       uint   `json:"id"`
				Username string `json:"username"`
				Avatar   string `json:"avatar,omitempty"`
			}, 0, len(chat.Users)),
			UnreadCount: 0, // Будет заполнено позже
		}

		// Добавляем информацию о пользователях чата
		for _, user := range chat.Users {
			if user.ID == userIDUint {
				continue // Пропускаем текущего пользователя
			}
			chatResp.Users = append(chatResp.Users, struct {
				ID       uint   `json:"id"`
				Username string `json:"username"`
				Avatar   string `json:"avatar,omitempty"`
			}{
				ID:       user.ID,
				Username: user.Username,
				Avatar:   user.Avatar,
			})
		}

		// Получаем последнее сообщение в чате
		var lastMessage models.Message
		result := s.db.DB.Where("chat_id = ?", chat.ID).
			Order("created_at DESC").
			Limit(1).
			Preload("User").
			First(&lastMessage)

		if result.Error == nil {
			// Расшифровываем содержимое сообщения
			var content string
			if len(lastMessage.Content) > 0 {
				plaintext, err := crypto.Decrypt(lastMessage.Content)
				if err != nil {
					logger.Errorf("Ошибка расшифровки сообщения #%d: %v", lastMessage.ID, err)
					content = "[Ошибка расшифровки]"
				} else {
					content = string(plaintext)
				}
			} else {
				content = lastMessage.PlainText
			}

			chatResp.LastMessage = &struct {
				ID        uint      `json:"id"`
				Content   string    `json:"content"`
				Type      string    `json:"type"`
				CreatedAt time.Time `json:"created_at"`
				User      struct {
					ID       uint   `json:"id"`
					Username string `json:"username"`
				} `json:"user"`
			}{
				ID:        lastMessage.ID,
				Content:   content,
				Type:      lastMessage.Type,
				CreatedAt: lastMessage.CreatedAt,
				User: struct {
					ID       uint   `json:"id"`
					Username string `json:"username"`
				}{
					ID:       lastMessage.User.ID,
					Username: lastMessage.User.Username,
				},
			}
		}

		// Получаем количество непрочитанных сообщений
		var unreadCount int64
		s.db.DB.Model(&models.Message{}).
			Joins("LEFT JOIN message_reads ON messages.id = message_reads.message_id AND message_reads.user_id = ?", userIDUint).
			Where("messages.chat_id = ? AND messages.user_id != ? AND message_reads.id IS NULL", chat.ID, userIDUint).
			Count(&unreadCount)

		chatResp.UnreadCount = int(unreadCount)

		response = append(response, chatResp)
	}

	c.JSON(http.StatusOK, gin.H{
		"chats": response,
	})
}

// handleCreateChat создает новый чат
func (s *Server) handleCreateChat(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		SendUnauthorized(c, "Пользователь не авторизован")
		return
	}
	currentUserID := userID.(uint)

	var req createChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		SendBadRequest(c, "Некорректные данные запроса: "+err.Error())
		return
	}

	// Проверки в зависимости от типа чата
	if req.Type == "direct" {
		if len(req.UserIDs) != 1 {
			SendBadRequest(c, "Для личного чата должен быть указан один user_id")
			return
		}
		if req.UserIDs[0] == currentUserID {
			SendBadRequest(c, "Нельзя создать чат с самим собой")
			return
		}
		// TODO: Проверить, существует ли уже личный чат между этими двумя пользователями
		req.Name = ""
	} else if req.Type == "group" {
		if len(req.UserIDs) < 1 {
			SendBadRequest(c, "Для группового чата должен быть указан хотя бы один user_id")
			return
		}
		if req.Name == "" {
			SendBadRequest(c, "Для группового чата должно быть указано имя")
			return
		}
	}

	// Проверяем существование всех указанных пользователей
	allUserIDs := append(req.UserIDs, currentUserID) // Добавляем создателя чата
	var users []models.User
	if err := s.db.DB.Where("id IN ?", allUserIDs).Find(&users).Error; err != nil {
		logger.Errorf("Ошибка проверки пользователей при создании чата: %v", err)
		SendInternalError(c, "Ошибка при проверке пользователей")
		return
	}
	if len(users) != len(allUserIDs) {
		SendBadRequest(c, "Один или несколько указанных пользователей не найдены")
		return
	}

	// Начинаем транзакцию
	tx := s.db.DB.Begin()
	if tx.Error != nil {
		logger.Errorf("Ошибка начала транзакции: %v", tx.Error)
		SendInternalError(c, "Ошибка сервера при создании чата")
		return
	}

	// Создаем чат
	newChat := models.Chat{
		Name:         req.Name,
		Type:         req.Type,
		LastActivity: time.Now(), // Устанавливаем время последней активности
	}
	if err := tx.Create(&newChat).Error; err != nil {
		tx.Rollback()
		logger.Errorf("Ошибка создания чата в БД: %v", err)
		SendInternalError(c, "Не удалось создать чат")
		return
	}

	// Добавляем пользователей в чат (включая создателя)
	chatUsers := make([]models.ChatUser, len(allUserIDs))
	for i, uid := range allUserIDs {
		chatUsers[i] = models.ChatUser{
			ChatID:   newChat.ID,
			UserID:   uid,
			JoinedAt: time.Now(),
			IsAdmin:  uid == currentUserID && req.Type == "group", // Создатель - админ в группе
		}
	}

	if err := tx.Create(&chatUsers).Error; err != nil {
		tx.Rollback()
		logger.Errorf("Ошибка добавления пользователей в чат: %v", err)
		SendInternalError(c, "Не удалось добавить пользователей в чат")
		return
	}

	// Фиксируем транзакцию
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		logger.Errorf("Ошибка фиксации транзакции: %v", err)
		SendInternalError(c, "Ошибка сервера при сохранении чата")
		return
	}

	logger.Infof("Пользователь %d создал чат #%d (тип: %s)", currentUserID, newChat.ID, newChat.Type)

	// Загружаем данные о пользователях для ответа
	if err := s.db.DB.Preload("Users").First(&newChat, newChat.ID).Error; err != nil {
		logger.Errorf("Ошибка загрузки пользователей для ответа: %v", err)
		// Продолжаем, но ответ будет без списка пользователей
	}

	// Формируем ответ
	chatResp := chatResponse{
		ID:           newChat.ID,
		Name:         newChat.Name,
		Type:         newChat.Type,
		CreatedAt:    newChat.CreatedAt,
		LastActivity: newChat.LastActivity,
		Users: make([]struct {
			ID       uint   `json:"id"`
			Username string `json:"username"`
			Avatar   string `json:"avatar,omitempty"`
		}, len(newChat.Users)),
		LastMessage: nil,
		UnreadCount: 0,
	}

	for i, user := range newChat.Users {
		chatResp.Users[i] = struct {
			ID       uint   `json:"id"`
			Username string `json:"username"`
			Avatar   string `json:"avatar,omitempty"`
		}{
			ID:       user.ID,
			Username: user.Username,
			Avatar:   user.Avatar,
		}
	}

	c.JSON(http.StatusCreated, chatResp)
}

// handleGetChat возвращает информацию о конкретном чате
func (s *Server) handleGetChat(c *gin.Context) {
	// TODO: Реализовать получение информации о чате
}

// handleUpdateChat обновляет информацию о чате
func (s *Server) handleUpdateChat(c *gin.Context) {
	// TODO: Реализовать обновление информации о чате
}

// handleLeaveChat позволяет пользователю покинуть групповой чат
func (s *Server) handleLeaveChat(c *gin.Context) {
	// TODO: Реализовать выход из чата
}

// handleAddUserToChat добавляет пользователя в групповой чат
func (s *Server) handleAddUserToChat(c *gin.Context) {
	// TODO: Реализовать добавление пользователя в чат
}

// handleRemoveUserFromChat удаляет пользователя из группового чата
func (s *Server) handleRemoveUserFromChat(c *gin.Context) {
	// TODO: Реализовать удаление пользователя из чата
}
