package database

import (
	"fmt"
	"log"
	"time"
	
	"messenger/server/config"
	"messenger/server/models"
	
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	*gorm.DB
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
	
	// Несколько попыток подключения к БД (для запуска в docker-compose)
	var db *gorm.DB
	var err error
	maxRetries := 5
	
	for i := 0; i < maxRetries; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		
		if err == nil {
			break
		}
		
		log.Printf("Попытка подключения к БД %d/%d: %v", i+1, maxRetries, err)
		time.Sleep(5 * time.Second)
	}
	
	if err != nil {
		return nil, fmt.Errorf("не удалось подключиться к базе данных после %d попыток: %w", maxRetries, err)
	}
	
	// Автомиграция моделей
	err = db.AutoMigrate(&models.User{}, &models.Message{})
	if err != nil {
		return nil, err
	}
	
	// Проверка миграции
	var count int64
	result := db.Model(&models.User{}).Count(&count)
	if result.Error != nil {
		log.Printf("Ошибка при проверке пользователей: %v", result.Error)
	} else {
		log.Printf("Система содержит %d пользователей", count)
	}
	
	return &Database{db}, nil
}

// Проверка, инициализирована ли система
func (d *Database) IsInitialized() bool {
	var count int64
	d.Model(&models.User{}).Count(&count)
	return count > 0
}

func (d *Database) Close() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
