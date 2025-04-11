package models

import (
	"time"

	"gorm.io/gorm"
)

// Chat представляет чат между пользователями
type Chat struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	Name         string         `json:"name"`                         // Название чата
	Type         string         `gorm:"size:20;not null" json:"type"` // тип: "personal" или "group"
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	LastActivity time.Time      `json:"last_activity"` // Время последней активности
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Связи с другими моделями
	Users    []User    `gorm:"many2many:chat_users;" json:"users,omitempty"`
	Messages []Message `json:"messages,omitempty"`
}

// ChatUser представляет связь между чатом и пользователем
type ChatUser struct {
	ChatID   uint      `gorm:"primaryKey;autoIncrement:false" json:"chat_id"`
	UserID   uint      `gorm:"primaryKey;autoIncrement:false" json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
	IsAdmin  bool      `json:"is_admin"`
}

// MessageRead представляет запись о прочтении сообщения
type MessageRead struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	MessageID uint      `gorm:"index" json:"message_id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	ReadAt    time.Time `json:"read_at"`
}
