package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"messenger/server/models"
)

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role" binding:"required,oneof=admin user"`
}

// Получение списка пользователей (только для админа)
func (s *Server) handleGetUsers(c *gin.Context) {
	// Проверяем роль
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Требуются права администратора"})
		return
	}

	var users []models.User
	result := s.db.DB.Find(&users)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения пользователей"})
		return
	}

	// Не возвращаем пароли
	for i := range users {
		users[i].Password = ""
	}

	c.JSON(http.StatusOK, users)
}

// Получение списка пользователей для чата (доступно всем пользователям)
func (s *Server) handleGetChatUsers(c *gin.Context) {
	// Получаем ID текущего пользователя
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не авторизован"})
		return
	}

	// Получаем список всех пользователей, кроме текущего
	var users []models.User
	result := s.db.DB.Where("id != ?", currentUserID).Find(&users)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения пользователей"})
		return
	}

	// Не возвращаем пароли и удаляем ненужные поля для безопасности
	type UserInfo struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
	}

	userList := make([]UserInfo, 0, len(users))
	for _, user := range users {
		userList = append(userList, UserInfo{
			ID:       user.ID,
			Username: user.Username,
		})
	}

	c.JSON(http.StatusOK, userList)
}

// Создание нового пользователя (только для админа)
func (s *Server) handleCreateUser(c *gin.Context) {
	// Проверяем роль
	role, exists := c.Get("role")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Требуются права администратора"})
		return
	}

	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
		return
	}

	// Проверяем уникальность имени пользователя
	var count int64
	s.db.DB.Model(&models.User{}).Where("username = ?", req.Username).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пользователь с таким именем уже существует"})
		return
	}

	// Создаем пользователя
	user := models.User{
		Username: req.Username,
		Password: req.Password,
		Role:     req.Role,
	}

	// Хешируем пароль
	if err := user.HashPassword(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка шифрования пароля"})
		return
	}

	// Сохраняем в базу данных
	result := s.db.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания пользователя: " + result.Error.Error()})
		return
	}

	// Не возвращаем пароль
	user.Password = ""

	c.JSON(http.StatusCreated, user)
}
