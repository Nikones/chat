package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

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
	RegistrationEnabled bool   `json:"registration_enabled"`
	MaintenanceMode     bool   `json:"maintenance_mode"`
	AppName             string `json:"app_name"`
	AppVersion          string `json:"app_version"`
}

// AdminUpdateSettingsRequest представляет запрос на обновление настроек
type AdminUpdateSettingsRequest struct {
	RegistrationEnabled bool   `json:"registration_enabled"`
	MaintenanceMode     bool   `json:"maintenance_mode"`
	AppName             string `json:"app_name"`
}

// handleAdminGetUsers обрабатывает запрос на получение списка всех пользователей
func (s *Server) handleAdminGetUsers(c *gin.Context) {
	// Проверяем, что пользователь имеет права администратора
	user, exists := c.Get("user")
	if !exists {
		SendUnauthorized(c, "Пользователь не авторизован")
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok || currentUser.Role != "admin" {
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
	// Проверяем, что пользователь имеет права администратора
	user, exists := c.Get("user")
	if !exists {
		SendUnauthorized(c, "Пользователь не авторизован")
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok || currentUser.Role != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	settings := AdminSettingsResponse{
		RegistrationEnabled: true,  // Используем временные значения
		MaintenanceMode:     false, // для демонстрации
		AppName:             "Мессенджер",
		AppVersion:          "1.0.0",
	}

	c.JSON(http.StatusOK, settings)
}

// handleAdminUpdateSettings обрабатывает запрос на обновление настроек системы
func (s *Server) handleAdminUpdateSettings(c *gin.Context) {
	// Проверяем, что пользователь имеет права администратора
	user, exists := c.Get("user")
	if !exists {
		SendUnauthorized(c, "Пользователь не авторизован")
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok || currentUser.Role != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	var request AdminUpdateSettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		SendBadRequest(c, "Некорректные данные запроса: "+err.Error())
		return
	}

	// В реальном приложении здесь будет код сохранения настроек
	// Но для прототипа просто возвращаем полученные настройки

	// Возвращаем обновленные настройки
	settings := AdminSettingsResponse{
		RegistrationEnabled: request.RegistrationEnabled,
		MaintenanceMode:     request.MaintenanceMode,
		AppName:             request.AppName,
		AppVersion:          "1.0.0", // Версия приложения не изменяется через API
	}

	c.JSON(http.StatusOK, settings)
}

// handleAdminUpdateUser обрабатывает запрос на обновление пользователя
func (s *Server) handleAdminUpdateUser(c *gin.Context) {
	// Проверяем, что пользователь имеет права администратора
	user, exists := c.Get("user")
	if !exists {
		SendUnauthorized(c, "Пользователь не авторизован")
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok || currentUser.Role != "admin" {
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
	// Проверяем, что пользователь имеет права администратора
	user, exists := c.Get("user")
	if !exists {
		SendUnauthorized(c, "Пользователь не авторизован")
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok || currentUser.Role != "admin" {
		SendForbidden(c, "Недостаточно прав")
		return
	}

	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		SendBadRequest(c, "Некорректный ID пользователя")
		return
	}

	// Нельзя удалить самого себя
	if uint(userID) == currentUser.ID {
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
