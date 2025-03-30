package api

import (
	"fmt"
	"net/http"
	"time"

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
	// Проверяем инициализацию через метод базы данных
	initialized := s.db.IsInitialized()

	// Возвращаем результат в JSON формате
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

	// Хешируем пароль
	if err := admin.HashPassword(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка шифрования пароля"})
		return
	}

	// Логируем данные для отладки (только в режиме разработки, удалить в продакшн)
	fmt.Printf("Создание пользователя admin: %s, хеш пароля: %s\n", admin.Username, admin.Password)

	// Сохраняем в базу данных
	result := s.db.DB.Create(&admin)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания администратора: " + result.Error.Error()})
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
		fmt.Printf("Неверный формат запроса на вход: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
		return
	}

	// Безопасное логирование (без пароля)
	fmt.Printf("Попытка входа: пользователь %s\n", req.Username)

	// Ищем пользователя
	var user models.User
	result := s.db.DB.Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		fmt.Printf("Ошибка поиска пользователя %s: %v\n", req.Username, result.Error)

		// Используем одинаковое сообщение об ошибке независимо от причины
		// (защита от перечисления пользователей)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверное имя пользователя или пароль"})

		// Добавляем небольшую задержку для защиты от атак перебором
		time.Sleep(300 * time.Millisecond)
		return
	}

	fmt.Printf("Пользователь найден: %s, ID: %d, Роль: %s\n", user.Username, user.ID, user.Role)

	// Проверяем пароль
	if !user.CheckPassword(req.Password) {
		fmt.Printf("Неверный пароль для пользователя %s\n", req.Username)

		// Используем то же сообщение об ошибке, что и выше
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверное имя пользователя или пароль"})

		// Добавляем небольшую задержку для защиты от атак перебором
		time.Sleep(300 * time.Millisecond)
		return
	}

	fmt.Printf("Пароль верный для пользователя %s, генерируем токен\n", req.Username)

	// Генерируем JWT токен
	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role, s.config.JWT.Secret, s.config.JWT.Expiry)
	if err != nil {
		fmt.Printf("Ошибка генерации токена: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	fmt.Printf("Успешный вход пользователя %s\n", req.Username)

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
	result := s.db.DB.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"authenticated": false})
		return
	}

	// Не возвращаем пароль
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"user":          user,
	})
}
