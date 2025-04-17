package api

import (
	"fmt"
	"net/http"
	"strconv"

	// "context" // Раскомментируйте, если используется Redis

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"messenger/logger"
	"messenger/models"
)

// AdminUserResponse представляет структуру для ответа с данными пользователя
type AdminUserResponse struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email,omitempty"`
	Role      string `json:"role"`
	Blocked   bool   `json:"blocked,omitempty"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// AdminGetUsersResponse представляет ответ на запрос списка пользователей
type AdminGetUsersResponse struct {
	Users []AdminUserResponse `json:"users"`
}

// AdminCreateUpdateUserRequest представляет запрос на создание/обновление пользователя
type AdminCreateUpdateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password,omitempty"`
	Role     string `json:"role" binding:"required"`
	Blocked  bool   `json:"blocked"`
}

// AdminSettingsResponse представляет настройки системы
type AdminSettingsResponse struct {
	RegistrationEnabled bool `json:"registration_enabled"`
	MaintenanceMode     bool `json:"maintenance_mode"`
}

// AdminUpdateSettingsRequest представляет запрос на обновление настроек
type AdminUpdateSettingsRequest struct {
	RegistrationEnabled bool `json:"registration_enabled"`
	MaintenanceMode     bool `json:"maintenance_mode"`
}

// AdminStatsResponse представляет статистику системы
type AdminStatsResponse struct {
	UserCount         int64 `json:"user_count"`
	MessageCount      int64 `json:"message_count"`
	ActiveConnections int   `json:"active_connections"`
}

// SystemStatusResponse представляет статус компонентов системы
type SystemStatusResponse struct {
	OverallStatus string `json:"overall_status"`
	DBStatus      string `json:"db_status"`
	RedisStatus   string `json:"redis_status"`
}

// handleAdminGetUsers обрабатывает запрос на получение списка всех пользователей
func (s *Server) handleAdminGetUsers(c *gin.Context) {
	// Исправленная проверка прав администратора
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	var users []models.User
	result := s.db.DB.Find(&users)
	if result.Error != nil {
		SendInternalError(c, "Ошибка при получении списка пользователей")
		return
	}

	var responseUsers []AdminUserResponse
	for _, user := range users {
		responseUsers = append(responseUsers, AdminUserResponse{
			ID:        user.ID,
			Username:  user.Username,
			Role:      user.Role,
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, AdminGetUsersResponse{Users: responseUsers})
}

// handleAdminGetSettings обрабатывает запрос на получение настроек системы
func (s *Server) handleAdminGetSettings(c *gin.Context) {
	// Исправленная проверка прав администратора
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	// Блокируем для чтения
	s.configLock.RLock()
	defer s.configLock.RUnlock()

	settings := AdminSettingsResponse{
		RegistrationEnabled: s.config.Server.RegistrationEnabled,
		MaintenanceMode:     s.config.Server.MaintenanceMode,
	}

	c.JSON(http.StatusOK, settings)
}

// handleAdminUpdateSettings обрабатывает запрос на обновление настроек системы
func (s *Server) handleAdminUpdateSettings(c *gin.Context) {
	// Исправленная проверка прав администратора
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	var request AdminUpdateSettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		SendBadRequest(c, "Некорректные данные запроса: "+err.Error())
		return
	}

	// Блокируем для записи
	s.configLock.Lock()
	s.config.Server.RegistrationEnabled = request.RegistrationEnabled
	s.config.Server.MaintenanceMode = request.MaintenanceMode
	s.configLock.Unlock() // Разблокируем сразу после записи

	logger.Infof("Администратор обновил настройки: RegistrationEnabled=%t, MaintenanceMode=%t", request.RegistrationEnabled, request.MaintenanceMode)

	// Снова блокируем для чтения, чтобы вернуть актуальные данные
	s.configLock.RLock()
	settings := AdminSettingsResponse{
		RegistrationEnabled: s.config.Server.RegistrationEnabled,
		MaintenanceMode:     s.config.Server.MaintenanceMode,
	}
	s.configLock.RUnlock()

	c.JSON(http.StatusOK, settings)
}

// handleAdminUpdateUser обрабатывает запрос на обновление пользователя
func (s *Server) handleAdminUpdateUser(c *gin.Context) {
	// Исправленная проверка прав администратора
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		SendBadRequest(c, "Некорректный ID пользователя")
		return
	}

	var request AdminCreateUpdateUserRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		SendBadRequest(c, "Некорректные данные запроса: "+err.Error())
		return
	}

	// Получаем пользователя из БД
	var targetUser models.User
	result := s.db.DB.First(&targetUser, userID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			SendNotFound(c, "Пользователь не найден")
		} else {
			SendInternalError(c, "Ошибка при поиске пользователя")
		}
		return
	}

	// Обновляем данные пользователя
	targetUser.Username = request.Username
	targetUser.Role = request.Role

	// Если указан пароль, обновляем его
	if request.Password != "" {
		// Используем метод HashPassword модели User
		targetUser.Password = request.Password
		if err := targetUser.HashPassword(); err != nil {
			SendInternalError(c, "Ошибка при хешировании пароля")
			return
		}
	}

	// Сохраняем изменения
	if err := s.db.DB.Save(&targetUser).Error; err != nil {
		SendInternalError(c, "Ошибка при обновлении пользователя")
		return
	}

	c.JSON(http.StatusOK, AdminUserResponse{
		ID:        targetUser.ID,
		Username:  targetUser.Username,
		Role:      targetUser.Role,
		CreatedAt: targetUser.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: targetUser.UpdatedAt.Format("2006-01-02 15:04:05"),
	})
}

// handleAdminDeleteUser обрабатывает запрос на удаление пользователя
func (s *Server) handleAdminDeleteUser(c *gin.Context) {
	// Исправленная проверка прав администратора
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	// Получаем ID текущего пользователя из контекста
	currentUserIDVal, _ := c.Get("userID")
	currentUserID := currentUserIDVal.(uint)

	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		SendBadRequest(c, "Некорректный ID пользователя")
		return
	}

	// Нельзя удалить самого себя
	if uint(userID) == currentUserID {
		SendBadRequest(c, "Нельзя удалить собственную учетную запись")
		return
	}

	// Получаем пользователя из БД для проверки
	var targetUser models.User
	result := s.db.DB.First(&targetUser, userID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			SendNotFound(c, "Пользователь не найден")
		} else {
			SendInternalError(c, "Ошибка при поиске пользователя")
		}
		return
	}

	// Удаляем пользователя
	if err := s.db.DB.Delete(&targetUser).Error; err != nil {
		SendInternalError(c, fmt.Sprintf("Ошибка при удалении пользователя: %v", err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Пользователь успешно удален"})
}

// handleAdminStats обрабатывает запрос на получение статистики системы
func (s *Server) handleAdminStats(c *gin.Context) {
	// Исправленная проверка прав администратора
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	var userCount int64
	s.db.DB.Model(&models.User{}).Count(&userCount)

	var messageCount int64
	// Уточните имя модели сообщения, если оно другое (например, models.ChatMessage)
	s.db.DB.Model(&models.Message{}).Count(&messageCount)

	// Подсчет активных WebSocket соединений (примерный)
	activeConnections := 0
	s.wsClients.Range(func(_, _ interface{}) bool {
		activeConnections++
		return true
	})

	stats := AdminStatsResponse{
		UserCount:         userCount,
		MessageCount:      messageCount,
		ActiveConnections: activeConnections,
	}

	c.JSON(http.StatusOK, stats)
}

// handleSystemStatus обрабатывает запрос на получение статуса системы
func (s *Server) handleSystemStatus(c *gin.Context) {
	// Проверка прав администратора
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	dbStatus := "OK"
	sqlDB, err := s.db.DB.DB()
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "Error"
		logger.Errorf("Ошибка проверки статуса БД: %v", err) // Логируем ошибку
	}

	// Пример проверки Redis
	redisStatus := "Not Used"
	// if s.redisClient != nil { ... } // Логика проверки Redis

	overallStatus := "OK"
	if dbStatus != "OK" || redisStatus == "Error" { // Проверяем и Redis если он используется и вернул ошибку
		overallStatus = "Degraded"
	}

	response := SystemStatusResponse{
		OverallStatus: overallStatus,
		DBStatus:      dbStatus,
		RedisStatus:   redisStatus,
	}

	c.JSON(http.StatusOK, response)
}
