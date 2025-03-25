package main

import (
	"log"
	
	"messenger/server/api"
	"messenger/server/config"
	"messenger/server/database"
)

func main() {
	// Загрузка конфигурации
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Ошибка загрузки конфигурации: %v", err)
	}
	
	// Инициализация базы данных
	db, err := database.NewDatabase(cfg)
	if err != nil {
		log.Fatalf("Ошибка инициализации базы данных: %v", err)
	}
	sqlDB, _ := db.DB.DB()
	defer sqlDB.Close()
	
	// Инициализация и запуск сервера
	server := api.NewServer(cfg, db)
	if err := server.Run(); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}
