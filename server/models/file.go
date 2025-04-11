package models

import (
	"time"

	"gorm.io/gorm"
)

// FileType определяет тип файла
type FileType string

const (
	FileTypeImage    FileType = "image"
	FileTypeDocument FileType = "document"
	FileTypeAudio    FileType = "audio"
	FileTypeVideo    FileType = "video"
	FileTypeOther    FileType = "other"
)

// File представляет информацию о загруженном файле
type File struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	MessageID     uint           `json:"message_id" gorm:"index"`
	FileName      string         `json:"file_name" gorm:"not null"`
	FileSize      int64          `json:"file_size" gorm:"not null"`
	FileType      FileType       `json:"file_type" gorm:"not null"`
	FilePath      string         `json:"-" gorm:"not null"` // Скрываем от клиента
	MimeType      string         `json:"mime_type" gorm:"not null"`
	DownloadToken string         `json:"download_token" gorm:"not null;uniqueIndex"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}
