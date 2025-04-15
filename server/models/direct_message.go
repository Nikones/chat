package models

import (
	"time"

	"gorm.io/gorm"
)

// DirectMessage представляет прямое сообщение между пользователями
type DirectMessage struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	SenderID    uint           `gorm:"index;not null" json:"sender_id"`
	RecipientID uint           `gorm:"index;not null" json:"recipient_id"`
	Content     []byte         `gorm:"type:bytea" json:"-"` // Шифрованное содержимое
	PlainText   string         `gorm:"-" json:"content"`    // Расшифрованный текст, только для JSON
	MessageType string         `gorm:"size:20;not null" json:"message_type"`
	IsRead      bool           `gorm:"default:false" json:"is_read"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	FileID      *uint          `json:"file_id,omitempty"`
	File        *File          `gorm:"foreignKey:FileID" json:"file,omitempty"`

	Sender    User `gorm:"foreignKey:SenderID" json:"sender"`
	Recipient User `gorm:"foreignKey:RecipientID" json:"recipient"`
}
