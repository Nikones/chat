package models

import (
	"time"

	"gorm.io/gorm"
)

// MessageType определяет тип сообщения
type MessageType string

const (
	MessageTypeText MessageType = "text"
	MessageTypeFile MessageType = "file"
)

// Message представляет сообщение в чате
type Message struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	ChatID    uint           `gorm:"index" json:"chat_id"`
	UserID    uint           `gorm:"index" json:"user_id"`
	Content   []byte         `gorm:"type:bytea" json:"-"` // Шифрованное содержимое, не сериализуется в JSON
	PlainText string         `gorm:"-" json:"content"`    // Расшифрованный текст, только для JSON
	Type      string         `gorm:"size:20;not null" json:"type"`
	FileID    *uint          `json:"file_id,omitempty"`
	File      *File          `gorm:"foreignKey:FileID" json:"file,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	User      User           `gorm:"foreignKey:UserID" json:"user"`
}

// GroupMessage для будущей реализации групповых чатов
type GroupMessage struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	SenderID    uint           `json:"sender_id" gorm:"index;not null"`
	GroupID     uint           `json:"group_id" gorm:"index;not null"`
	Content     string         `json:"content" gorm:"type:text"`
	MessageType MessageType    `json:"message_type" gorm:"type:varchar(10);default:'text'"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	Sender User   `json:"-" gorm:"foreignKey:SenderID"`
	Files  []File `json:"files,omitempty" gorm:"foreignKey:MessageID"`
}
