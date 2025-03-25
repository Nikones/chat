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
	result := s.db.Find(&users)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения пользователей"})
		return
	}
	
	c.JSON(http.StatusOK, users)
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
	s.db.Model(&models.User{}).Where("username = ?", req.Username).Count(&count)
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
	
	result := s.db.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания пользователя"})
		return
	}
	
	// Не возвращаем пароль
	user.Password = ""
	
	c.JSON(http.StatusCreated, user)
}
