package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"messenger/config"
	"messenger/logger"
)

// Клиент Redis для брокера сообщений
type RedisClient struct {
	client  *redis.Client
	enabled bool
	pubsub  *redis.PubSub
	ctx     context.Context
}

// Сообщение для Redis
type PubSubMessage struct {
	Type        string          `json:"type"`
	RecipientID uint            `json:"recipient_id"`
	Content     json.RawMessage `json:"content"`
	SenderID    uint            `json:"sender_id"`
}

// Функция обратного вызова для обработки сообщений
type MessageHandler func(msg PubSubMessage)

// Создание нового клиента Redis
func NewRedisClient(cfg *config.Config) (*RedisClient, error) {
	// Проверяем, включен ли Redis в конфигурации
	if !cfg.Redis.Enabled {
		logger.Info("Redis отключен в конфигурации, используется режим без Redis")
		return &RedisClient{
			enabled: false,
			ctx:     context.Background(),
		}, nil
	}

	redisAddr := fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port)
	logger.Infof("Подключение к Redis на %s", redisAddr)

	// Подключаемся к Redis
	opt := &redis.Options{
		Addr:     redisAddr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	}

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Проверяем соединение
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := client.Ping(pingCtx).Result()
	if err != nil {
		logger.Errorf("Ошибка подключения к Redis: %v", err)
		return nil, fmt.Errorf("ошибка подключения к Redis: %w", err)
	}

	logger.Info("Успешное подключение к Redis")

	return &RedisClient{
		client:  client,
		enabled: true,
		ctx:     ctx,
	}, nil
}

// Проверка, включен ли Redis
func (r *RedisClient) IsEnabled() bool {
	return r.enabled
}

// НОВЫЙ МЕТОД: Ping проверяет соединение с Redis
func (r *RedisClient) Ping(ctx context.Context) error {
	if !r.enabled || r.client == nil {
		return fmt.Errorf("Redis client is not enabled or initialized")
	}
	return r.client.Ping(ctx).Err()
}

// Закрытие соединения с Redis
func (r *RedisClient) Close() error {
	if !r.enabled {
		return nil
	}

	logger.Debug("Закрытие соединения с Redis")

	if r.pubsub != nil {
		if err := r.pubsub.Close(); err != nil {
			logger.Errorf("Ошибка закрытия PubSub: %v", err)
			return fmt.Errorf("ошибка закрытия PubSub: %w", err)
		}
	}

	return r.client.Close()
}

// Публикация сообщения
func (r *RedisClient) PublishMessage(channel string, message PubSubMessage) error {
	if !r.enabled {
		return nil
	}

	ctx := map[string]interface{}{
		"channel":      channel,
		"message_type": message.Type,
		"sender_id":    message.SenderID,
		"recipient_id": message.RecipientID,
	}

	logger.DebugWithContext(ctx, "Публикация сообщения в Redis")

	data, err := json.Marshal(message)
	if err != nil {
		logger.ErrorWithContext(ctx, "Ошибка маршалинга сообщения:", err)
		return fmt.Errorf("ошибка маршалинга сообщения: %w", err)
	}

	publishCtx, cancel := context.WithTimeout(r.ctx, 2*time.Second)
	defer cancel()

	err = r.client.Publish(publishCtx, channel, data).Err()
	if err != nil {
		logger.ErrorWithContext(ctx, "Ошибка публикации в Redis:", err)
		return fmt.Errorf("ошибка публикации сообщения: %w", err)
	}

	logger.DebugWithContext(ctx, "Сообщение успешно опубликовано в Redis")
	return nil
}

// Подписка на канал
func (r *RedisClient) Subscribe(handler MessageHandler) error {
	if !r.enabled {
		return nil
	}

	// Создаем подписку на все каналы
	r.pubsub = r.client.PSubscribe(r.ctx, "chat:*")
	logger.Info("Подписка на каналы Redis установлена (шаблон: chat:*)")

	// Запускаем горутину для обработки сообщений
	go func() {
		for {
			msg, err := r.pubsub.ReceiveMessage(r.ctx)
			if err != nil {
				logger.Errorf("Ошибка получения сообщения из Redis: %v", err)
				time.Sleep(time.Second) // Ждем перед повторной попыткой
				continue
			}

			logger.Debugf("Получено сообщение из канала %s Redis", msg.Channel)

			// Декодируем сообщение
			var pubsubMsg PubSubMessage
			if err := json.Unmarshal([]byte(msg.Payload), &pubsubMsg); err != nil {
				logger.Errorf("Ошибка декодирования сообщения из Redis: %v", err)
				continue
			}

			// Вызываем обработчик
			handler(pubsubMsg)
		}
	}()

	logger.Info("Обработчик сообщений Redis запущен")
	return nil
}

// Создание уникального идентификатора канала для групповых чатов
func CreateGroupChatChannel(groupID uint) string {
	return fmt.Sprintf("chat:group:%d", groupID)
}

// Создание уникального идентификатора канала для личных чатов
func CreatePrivateChatChannel(user1ID, user2ID uint) string {
	// Сортируем ID, чтобы канал был одинаковым независимо от порядка
	if user1ID > user2ID {
		user1ID, user2ID = user2ID, user1ID
	}
	return fmt.Sprintf("chat:private:%d:%d", user1ID, user2ID)
}

// Глобальный канал для служебных сообщений
const GlobalChannel = "chat:global"
