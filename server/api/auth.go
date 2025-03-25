package api

import (
	"net/http"
	
	"github.com/gin-gonic/gin"
	
	"messenger/server/middleware"
	"messenger/server/models"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

type InitSetupRequest struct {
	AdminUsername string `json:"admin_username" binding:"required,min=3,max=30"`
	AdminPassword string `json:"admin_password" binding:"required,min=8"`
}

// Проверка, инициализирована ли система
func (s *Server) handleCheckInitialized(c *gin.Context) {
	initialized := s.db.IsInitialized()
	c.JSON(http.StatusOK, gin.H{
		"initialized": initialized,
	})
}

// Первоначальная настройка системы
func (s *Server) handleInitialSetup(c *gin.Context) {
	// Проверяем, инициализирована ли уже система
	if s.db.IsInitialized() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Система уже инициализирована"})
		return
	}
	
	var req InitSetupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
		return
	}
	
	// Создаем администратора
	admin := models.User{
		Username: req.AdminUsername,
		Password: req.AdminPassword,
		Role:     "admin",
	}
	
	result := s.db.Create(&admin)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания администратора"})
		return
	}
	
	// Генерируем JWT токен для автоматического входа
	token, err := middleware.GenerateToken(admin.ID, admin.Username, admin.Role, s.config.JWT.Secret, s.config.JWT.Expiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}
	
	// Не возвращаем пароль
	admin.Password = ""
	
	c.JSON(http.StatusOK, LoginResponse{
		Token: token,
		User:  admin,
	})
}

// Обработчик входа в систему
func (s *Server) handleLogin(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
		return
	}
	
	// Ищем пользователя
	var user models.User
	result := s.db.Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверное имя пользователя или пароль"})
		return
	}
	
	// Проверяем пароль
	if !user.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверное имя пользователя или пароль"})
		return
	}
	
	// Генерируем JWT токен
	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role, s.config.JWT.Secret, s.config.JWT.Expiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}
	
	// Не возвращаем пароль
	user.Password = ""
	
	c.JSON(http.StatusOK, LoginResponse{
		Token: token,
		User:  user,
	})
}

// Добавим проверку состояния аутентификации для клиента
func (s *Server) handleAuthCheck(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"authenticated": false})
		return
	}
	
	var user models.User
	result := s.db.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"authenticated": false})
		return
	}
	
	// Не возвращаем пароль
	user.Password = ""
	
	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"user": user,
	})
}
