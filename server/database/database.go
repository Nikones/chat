package database

import (
	"time"

	"messenger/models"
)

// Добавляем новые методы для работы с чатами и сообщениями

// GetChatByID возвращает информацию о чате по ID
func (db *Database) GetChatByID(chatID uint) (*models.Chat, error) {
	var chat models.Chat
	result := db.DB.First(&chat, chatID)
	if result.Error != nil {
		return nil, result.Error
	}
	return &chat, nil
}

// IsUserInChat проверяет, является ли пользователь участником чата
func (db *Database) IsUserInChat(userID, chatID uint) bool {
	var count int64
	db.DB.Model(&models.ChatUser{}).
		Where("user_id = ? AND chat_id = ?", userID, chatID).
		Count(&count)
	return count > 0
}

// GetChatUsers возвращает список пользователей чата
func (db *Database) GetChatUsers(chatID uint) ([]models.User, error) {
	var users []models.User

	// Получаем ID пользователей из связующей таблицы
	rows, err := db.DB.Table("chat_users").
		Select("user_id").
		Where("chat_id = ?", chatID).
		Rows()

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Собираем ID пользователей
	var userIDs []uint
	for rows.Next() {
		var userID uint
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, userID)
	}

	// Получаем данные пользователей
	if len(userIDs) > 0 {
		if err := db.DB.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
			return nil, err
		}
	}

	return users, nil
}

// GetChatMessages возвращает сообщения чата
func (db *Database) GetChatMessages(chatID uint, limit int) ([]models.Message, error) {
	var messages []models.Message

	// Получаем сообщения с данными отправителя
	result := db.DB.Preload("User").
		Where("chat_id = ?", chatID).
		Order("created_at DESC").
		Limit(limit).
		Find(&messages)

	if result.Error != nil {
		return nil, result.Error
	}

	// Меняем порядок на хронологический
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// CreateMessage создает новое сообщение
func (db *Database) CreateMessage(message *models.Message) error {
	result := db.DB.Create(message)
	return result.Error
}

// UpdateChat обновляет информацию о чате
func (db *Database) UpdateChat(chat *models.Chat) error {
	result := db.DB.Save(chat)
	return result.Error
}

// GetUserByID возвращает пользователя по ID
func (db *Database) GetUserByID(userID uint) (*models.User, error) {
	var user models.User
	result := db.DB.First(&user, userID)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

// GetMessageByID возвращает сообщение по ID
func (db *Database) GetMessageByID(messageID uint) (*models.Message, error) {
	var message models.Message
	result := db.DB.First(&message, messageID)
	if result.Error != nil {
		return nil, result.Error
	}
	return &message, nil
}

// MarkMessageAsRead отмечает сообщение как прочитанное
func (db *Database) MarkMessageAsRead(messageID, userID uint) error {
	// Проверяем, существует ли запись о прочтении
	var count int64
	db.DB.Model(&models.MessageRead{}).
		Where("message_id = ? AND user_id = ?", messageID, userID).
		Count(&count)

	// Если записи нет, создаем новую
	if count == 0 {
		read := models.MessageRead{
			MessageID: messageID,
			UserID:    userID,
			ReadAt:    time.Now(),
		}
		return db.DB.Create(&read).Error
	}

	return nil
}
