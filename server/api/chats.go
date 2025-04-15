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
	// TODO: Реализовать создание чата
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
