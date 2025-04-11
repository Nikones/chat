package config

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/go-playground/validator/v10"
)

type Config struct {
	Server struct {
		Port  string `json:"port" validate:"required"`
		Host  string `json:"host" validate:"required"`
		Debug bool   `json:"debug"`
	} `json:"server"`

	Database struct {
		Host     string `json:"host" validate:"required"`
		Port     string `json:"port" validate:"required"`
		User     string `json:"user" validate:"required"`
		Password string `json:"password"`
		DBName   string `json:"dbname" validate:"required"`
	} `json:"database"`

	JWT struct {
		Secret string `json:"secret" validate:"required,min=32"`
		Expiry int    `json:"expiry" validate:"required,min=1,max=720"` // в часах, макс. 30 дней
	} `json:"jwt"`

	SFU struct {
		Host string `json:"host" validate:"required"`
		Port string `json:"port" validate:"required"`
	} `json:"sfu"`

	Redis struct {
		Host     string `json:"host" validate:"required"`
		Port     string `json:"port" validate:"required"`
		Password string `json:"password"`
		DB       int    `json:"db" validate:"min=0,max=15"`
		Enabled  bool   `json:"enabled" validate:"required"`
	} `json:"redis"`

	FileStorage struct {
		Path             string `json:"path" validate:"required"`
		MaxSizeMB        int    `json:"max_size_mb" validate:"required,min=1,max=1000"`
		AllowedMimeTypes string `json:"allowed_mime_types" validate:"required"`
	} `json:"file_storage"`
}

func Load() (*Config, error) {
	configPath := os.Getenv("CONFIG_PATH")
	if configPath == "" {
		configPath = "server/config/config.json"
	}

	file, err := os.Open(configPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	config := &Config{}
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(config); err != nil {
		return nil, err
	}

	// Переопределение из переменных окружения
	if os.Getenv("SERVER_PORT") != "" {
		config.Server.Port = os.Getenv("SERVER_PORT")
	}

	if os.Getenv("SERVER_HOST") != "" {
		config.Server.Host = os.Getenv("SERVER_HOST")
	}

	if os.Getenv("DEBUG") != "" {
		config.Server.Debug = os.Getenv("DEBUG") == "true"
	}

	if os.Getenv("DB_HOST") != "" {
		config.Database.Host = os.Getenv("DB_HOST")
	}

	if os.Getenv("DB_PORT") != "" {
		config.Database.Port = os.Getenv("DB_PORT")
	}

	if os.Getenv("DB_USER") != "" {
		config.Database.User = os.Getenv("DB_USER")
	}

	if os.Getenv("DB_PASSWORD") != "" {
		config.Database.Password = os.Getenv("DB_PASSWORD")
	}

	if os.Getenv("DB_NAME") != "" {
		config.Database.DBName = os.Getenv("DB_NAME")
	}

	if os.Getenv("JWT_SECRET") != "" {
		config.JWT.Secret = os.Getenv("JWT_SECRET")
	}

	if os.Getenv("SFU_HOST") != "" {
		config.SFU.Host = os.Getenv("SFU_HOST")
	}

	if os.Getenv("SFU_PORT") != "" {
		config.SFU.Port = os.Getenv("SFU_PORT")
	}

	if os.Getenv("REDIS_HOST") != "" {
		config.Redis.Host = os.Getenv("REDIS_HOST")
	}

	if os.Getenv("REDIS_PORT") != "" {
		config.Redis.Port = os.Getenv("REDIS_PORT")
	}

	if os.Getenv("REDIS_PASSWORD") != "" {
		config.Redis.Password = os.Getenv("REDIS_PASSWORD")
	}

	if os.Getenv("REDIS_ENABLED") != "" {
		config.Redis.Enabled = os.Getenv("REDIS_ENABLED") == "true"
	}

	// Устанавливаем значения по умолчанию для файлового хранилища, если не заданы
	if config.FileStorage.Path == "" {
		config.FileStorage.Path = "./uploads"
	}

	if config.FileStorage.MaxSizeMB == 0 {
		config.FileStorage.MaxSizeMB = 100
	}

	if config.FileStorage.AllowedMimeTypes == "" {
		config.FileStorage.AllowedMimeTypes = "image/jpeg,image/png,image/gif,application/pdf,audio/mpeg,video/mp4"
	}

	// Валидация конфигурации
	validate := validator.New()
	if err := validate.Struct(config); err != nil {
		return nil, fmt.Errorf("ошибка валидации конфигурации: %w", err)
	}

	return config, nil
}
