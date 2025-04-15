package database

import (
	"context"
	"fmt"
	"time"

	"messenger/server/config"
	"messenger/server/logger"
	"messenger/server/models"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

type Database struct {
	*gorm.DB
}

// Создание GORM логгера на основе Zap
type GormZapLogger struct{}

func (g GormZapLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	return g
}

func (g GormZapLogger) Info(ctx context.Context, s string, args ...interface{}) {
	logger.Infof(s, args...)
}

func (g GormZapLogger) Warn(ctx context.Context, s string, args ...interface{}) {
	logger.Warnf(s, args...)
}

func (g GormZapLogger) Error(ctx context.Context, s string, args ...interface{}) {
	logger.Errorf(s, args...)
}

func (g GormZapLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	elapsed := time.Since(begin)
	sql, rows := fc()

	logFields := map[string]interface{}{
		"elapsed": elapsed,
		"rows":    rows,
		"sql":     sql,
	}

	if err != nil {
		logFields["error"] = err
		logger.ErrorfWithContext(logFields, "SQL Error: %s", err.Error())
		return
	}

	// Логируем только медленные запросы (более 200ms)
	if elapsed > 200*time.Millisecond {
		logger.WarnfWithContext(logFields, "Slow SQL query (%.2fms)", float64(elapsed.Microseconds())/1000.0)
	} else if logger.GetLogger().Level() == zap.DebugLevel {
		// В режиме отладки логируем все запросы
		logger.DebugfWithContext(logFields, "SQL query (%.2fms)", float64(elapsed.Microseconds())/1000.0)
	}
}

func NewDatabase(cfg *config.Config) (*Database, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
	)

	logger.Infof("Подключение к БД: %s:%s/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.DBName)

	// Несколько попыток подключения к БД (для запуска в docker-compose)
	var db *gorm.DB
	var err error
	maxRetries := 5

	// Настройка GORM логгера
	gormLogConfig := &gormlogger.Config{
		SlowThreshold: 200 * time.Millisecond,
		LogLevel:      gormlogger.Warn,
		Colorful:      false,
	}

	// Выбираем уровень логирования в зависимости от уровня основного логгера
	if logger.GetLogger().Level() == zap.DebugLevel {
		gormLogConfig.LogLevel = gormlogger.Info
	}

	for i := 0; i < maxRetries; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: GormZapLogger{},
		})

		if err == nil {
			break
		}

		logger.Warnf("Попытка подключения к БД %d/%d: %v", i+1, maxRetries, err)
		time.Sleep(5 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("не удалось подключиться к базе данных после %d попыток: %w", maxRetries, err)
	}

	// Автомиграция моделей
	logger.Info("Запуск миграции моделей")
	err = db.AutoMigrate(
		&models.User{},
		&models.Chat{},
		&models.ChatUser{},
		&models.Message{},
		&models.File{},
		&models.DirectMessage{},
	)
	if err != nil {
		return nil, fmt.Errorf("ошибка миграции: %w", err)
	}

	// Проверка миграции
	var count int64
	result := db.Model(&models.User{}).Count(&count)
	if result.Error != nil {
		logger.Warnf("Ошибка при проверке пользователей: %v", result.Error)
	} else {
		logger.Infof("Система содержит %d пользователей", count)
	}

	return &Database{db}, nil
}

// Проверка, инициализирована ли система
func (db *Database) IsInitialized() (bool, error) {
	var count int64
	err := db.DB.Model(&models.User{}).Count(&count).Error
	if err != nil {
		return false, err
	}

	// Система считается инициализированной, если есть хотя бы один пользователь
	return count > 0, nil
}

// Сброс данных (для тестирования и разработки)
func (db *Database) Reset() error {
	logger.Warn("Сброс всех данных в БД!")

	// Удаляем все записи из таблиц
	if err := db.DB.Exec("DELETE FROM files").Error; err != nil {
		return err
	}

	if err := db.DB.Exec("DELETE FROM messages").Error; err != nil {
		return err
	}

	if err := db.DB.Exec("DELETE FROM users").Error; err != nil {
		return err
	}

	logger.Info("Данные успешно сброшены")
	return nil
}

func (d *Database) Close() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
