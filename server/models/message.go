package models

import (
	"time"
	
	"gorm.io/gorm"
)

type Message struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	SenderID     uint           `json:"sender_id" gorm:"index;not null"`
	RecipientID  uint           `json:"recipient_id" gorm:"index;not null"`
	Content      string         `json:"content" gorm:"type:text"` // Зашифрованный контент
	IsRead       bool           `json:"is_read" gorm:"default:false"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
	
	Sender     User `json:"-" gorm:"foreignKey:SenderID"`
	Recipient  User `json:"-" gorm:"foreignKey:RecipientID"`
}
