package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"messenger/server/models"
)

// Конфигурация загрузки файлов
const (
	// Директория для хранения файлов
	uploadDir = "./uploads"

	// Максимальный размер файла (100 МБ)
	maxFileSize = 100 * 1024 * 1024

	// Разрешенные типы файлов
	allowedMimeTypes = "image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/mpeg,audio/mp4,video/mp4,video/mpeg,application/zip,application/x-zip-compressed"
)

// Генерация уникального токена для скачивания
func generateDownloadToken() (string, error) {
	token := make([]byte, 16)
	_, err := rand.Read(token)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(token), nil
}

// Определение типа файла по MIME-типу
func determineFileType(mimeType string) models.FileType {
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		return models.FileTypeImage
	case strings.HasPrefix(mimeType, "audio/"):
		return models.FileTypeAudio
	case strings.HasPrefix(mimeType, "video/"):
		return models.FileTypeVideo
	case strings.HasPrefix(mimeType, "application/pdf") ||
		strings.HasPrefix(mimeType, "application/msword") ||
		strings.HasPrefix(mimeType, "application/vnd.openxmlformats-officedocument"):
		return models.FileTypeDocument
	default:
		return models.FileTypeOther
	}
}

// Проверка, разрешен ли тип файла
func isAllowedFileType(mimeType string) bool {
	allowedTypes := strings.Split(allowedMimeTypes, ",")
	for _, allowedType := range allowedTypes {
		if strings.HasPrefix(mimeType, allowedType) || allowedType == mimeType {
			return true
		}
	}
	return false
}

// Структура запроса для загрузки файла
type FileUploadRequest struct {
	RecipientID uint                  `form:"recipient_id" binding:"required"`
	Message     string                `form:"message"`
	File        *multipart.FileHeader `form:"file" binding:"required"`
}

// Обработчик загрузки файлов
func (s *Server) handleFileUpload(c *gin.Context) {
	// Получаем ID отправителя из контекста аутентификации
	senderID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не авторизован"})
		return
	}

	// Проверяем и создаем директорию для загрузки
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("Ошибка создания директории для загрузки: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сервера при подготовке загрузки"})
		return
	}

	// Получаем форму
	var req FileUploadRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
		return
	}

	// Проверяем размер файла
	if req.File.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Размер файла превышает максимально допустимый"})
		return
	}

	// Получаем MIME тип
	file, err := req.File.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка открытия файла"})
		return
	}
	defer file.Close()

	// Проверка типа файла по расширению и MIME-типу
	mimeType := req.File.Header.Get("Content-Type")
	if !isAllowedFileType(mimeType) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неподдерживаемый тип файла"})
		return
	}

	// Генерируем уникальный токен для скачивания
	downloadToken, err := generateDownloadToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	// Генерируем уникальное имя файла
	fileExt := filepath.Ext(req.File.Filename)
	uniqueFileName := fmt.Sprintf("%s%s", downloadToken, fileExt)
	filePath := filepath.Join(uploadDir, uniqueFileName)

	// Сохраняем файл
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания файла"})
		return
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения файла"})
		return
	}

	// Начинаем транзакцию
	tx := s.db.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка базы данных"})
		return
	}

	// Создаем сообщение
	message := models.DirectMessage{
		SenderID:    senderID.(uint),
		RecipientID: req.RecipientID,
		Content:     []byte(req.Message),
		MessageType: "file",
		IsRead:      false,
	}

	if err := tx.Create(&message).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения сообщения"})
		return
	}

	// Создаем запись о файле
	fileRecord := models.File{
		MessageID:     message.ID,
		FileName:      req.File.Filename,
		FileSize:      req.File.Size,
		FileType:      determineFileType(mimeType),
		FilePath:      filePath,
		MimeType:      mimeType,
		DownloadToken: downloadToken,
	}

	if err := tx.Create(&fileRecord).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения информации о файле"})
		return
	}

	// Фиксируем транзакцию
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка фиксации транзакции"})
		return
	}

	// Отправляем уведомление через WebSocket
	message.File = &fileRecord

	// Сериализуем данные в JSON
	messageJSON, err := json.Marshal(message)
	if err != nil {
		log.Printf("Ошибка сериализации сообщения: %v", err)
	} else {
		wsMessage := WSMessage{
			Type:    "file",
			Payload: json.RawMessage(messageJSON),
		}

		// Отправляем сообщение через WebSocket
		if err := s.sendMessageToUser(req.RecipientID, wsMessage); err != nil {
			log.Printf("Ошибка отправки сообщения о файле через WebSocket: %v", err)
		}
	}

	// Возвращаем информацию о загруженном файле
	c.JSON(http.StatusOK, gin.H{
		"message":    "Файл успешно загружен",
		"file":       fileRecord,
		"message_id": message.ID,
	})
}

// Обработчик скачивания файлов
func (s *Server) handleFileDownload(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Токен не указан"})
		return
	}

	// Ищем файл по токену
	var file models.File
	if err := s.db.DB.Where("download_token = ?", token).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Файл не найден"})
		return
	}

	// Проверяем, существует ли файл на диске
	if _, err := os.Stat(file.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Файл не найден на сервере"})
		return
	}

	// Устанавливаем правильные заголовки
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", file.FileName))
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", file.FileSize))
	c.Header("Cache-Control", "no-cache")

	// Отправляем файл
	c.File(file.FilePath)
}

// sendMessageToUser отправляет сообщение через WebSocket
func (s *Server) sendMessageToUser(userID uint, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("ошибка сериализации сообщения: %v", err)
	}

	s.sendToUser(userID, data)
	return nil
}
