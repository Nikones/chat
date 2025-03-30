package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// LoginAttempt хранит информацию о попытках входа
type LoginAttempt struct {
	Count     int       // Количество попыток
	FirstTry  time.Time // Время первой попытки
	LastTry   time.Time // Время последней попытки
	BlockedAt time.Time // Время блокировки (если установлено)
}

// AuthLimiter защищает от атак грубой силы на API входа
type AuthLimiter struct {
	attempts    map[string]*LoginAttempt // IP -> попытки
	mu          sync.RWMutex             // Мьютекс для синхронизации доступа к map
	maxAttempts int                      // Максимальное число попыток
	blockTime   time.Duration            // Время блокировки
	resetTime   time.Duration            // Время сброса счетчика
}

// NewAuthLimiter создает новый лимитер авторизации
func NewAuthLimiter(maxAttempts int, blockTime, resetTime time.Duration) *AuthLimiter {
	return &AuthLimiter{
		attempts:    make(map[string]*LoginAttempt),
		maxAttempts: maxAttempts,
		blockTime:   blockTime,
		resetTime:   resetTime,
	}
}

// Middleware возвращает Gin middleware для ограничения попыток входа
func (al *AuthLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Только для эндпоинта логина
		if c.Request.URL.Path != "/api/login" || c.Request.Method != "POST" {
			c.Next()
			return
		}

		// Получаем IP-адрес клиента
		clientIP := c.ClientIP()

		// Проверяем, не заблокирован ли клиент
		al.mu.RLock()
		attempt, exists := al.attempts[clientIP]
		al.mu.RUnlock()

		now := time.Now()

		if exists {
			// Если клиент заблокирован
			if !attempt.BlockedAt.IsZero() && now.Sub(attempt.BlockedAt) < al.blockTime {
				// Вычисляем время до разблокировки
				remainingTime := al.blockTime - now.Sub(attempt.BlockedAt)
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error": "Слишком много попыток входа. Попробуйте позже.",
					"wait":  int(remainingTime.Seconds()),
				})
				c.Abort()
				return
			}

			// Проверяем, не нужно ли сбросить счетчик попыток
			if now.Sub(attempt.LastTry) > al.resetTime {
				al.mu.Lock()
				al.attempts[clientIP] = &LoginAttempt{
					Count:    1,
					FirstTry: now,
					LastTry:  now,
				}
				al.mu.Unlock()
			} else {
				// Увеличиваем счетчик попыток
				al.mu.Lock()
				attempt.Count++
				attempt.LastTry = now

				// Если достигнут лимит, блокируем
				if attempt.Count > al.maxAttempts {
					attempt.BlockedAt = now
				}
				al.mu.Unlock()

				// Проверяем, не превышен ли лимит
				if attempt.Count > al.maxAttempts {
					c.JSON(http.StatusTooManyRequests, gin.H{
						"error": "Слишком много попыток входа. Попробуйте позже.",
						"wait":  int(al.blockTime.Seconds()),
					})
					c.Abort()
					return
				}
			}
		} else {
			// Первая попытка
			al.mu.Lock()
			al.attempts[clientIP] = &LoginAttempt{
				Count:    1,
				FirstTry: now,
				LastTry:  now,
			}
			al.mu.Unlock()
		}

		// Продолжаем обработку запроса
		c.Next()

		// После обработки проверяем статус ответа
		if c.Writer.Status() == http.StatusUnauthorized {
			// Это была неудачная попытка, но счетчик уже увеличен выше
			return
		} else if c.Writer.Status() == http.StatusOK {
			// Успешный вход, сбрасываем счетчик
			al.mu.Lock()
			delete(al.attempts, clientIP)
			al.mu.Unlock()
		}
	}
}

// Cleanup запускает периодическую очистку старых записей
func (al *AuthLimiter) Cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			now := time.Now()
			al.mu.Lock()
			for ip, attempt := range al.attempts {
				// Удаляем записи, если блокировка истекла или было долгое бездействие
				if (!attempt.BlockedAt.IsZero() && now.Sub(attempt.BlockedAt) > al.blockTime) ||
					now.Sub(attempt.LastTry) > al.resetTime*2 {
					delete(al.attempts, ip)
				}
			}
			al.mu.Unlock()
		}
	}()
}
