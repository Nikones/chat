package config

import (
	"encoding/json"
	"os"
)

type Config struct {
	Server struct {
		Port string `json:"port"`
		Host string `json:"host"`
	} `json:"server"`
	
	Database struct {
		Host     string `json:"host"`
		Port     string `json:"port"`
		User     string `json:"user"`
		Password string `json:"password"`
		DBName   string `json:"dbname"`
	} `json:"database"`
	
	JWT struct {
		Secret string `json:"secret"`
		Expiry int    `json:"expiry"` // в часах
	} `json:"jwt"`
	
	SFU struct {
		Host string `json:"host"`
		Port string `json:"port"`
	} `json:"sfu"`
	
	Redis struct {
		Host     string `json:"host"`
		Port     string `json:"port"`
		Password string `json:"password"`
		DB       int    `json:"db"`
	} `json:"redis"`
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
	
	return config, nil
}
