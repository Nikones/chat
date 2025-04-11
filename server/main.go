package main

import (
	"os"

	"messenger/api"
	"messenger/config"
	"messenger/database"
	"messenger/logger"
)

func main() {
	// Инициализация логгера
	logLevel := logger.Level(os.Getenv("LOG_LEVEL"))
	if logLevel == "" {
		logLevel = logger.InfoLevel
	}

	// Определяем режим работы (разработка или продакшн)
	isProduction := os.Getenv("APP_ENV") == "production"
	logger.Init(logLevel, isProduction)

	logger.Info("Запуск сервера мессенджера")

	// Загрузка конфигурации
	cfg, err := config.Load()
	if err != nil {
		logger.Fatalf("Ошибка загрузки конфигурации: %v", err)
	}

	logger.Infof("Конфигурация загружена успешно (порт: %s)", cfg.Server.Port)

	// Инициализация базы данных
	db, err := database.NewDatabase(cfg)
	if err != nil {
		logger.Fatalf("Ошибка инициализации базы данных: %v", err)
	}
	sqlDB, _ := db.DB.DB()
	defer sqlDB.Close()

	logger.Info("База данных инициализирована успешно")

	// Инициализация и запуск сервера
	server := api.NewServer(cfg, db)
	logger.Info("Сервер инициализирован, запуск...")

	if err := server.Run(); err != nil {
		logger.Fatalf("Ошибка запуска сервера: %v", err)
	}
}
