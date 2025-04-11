FROM golang:1.23-alpine AS builder

# Установка зависимостей для сборки
RUN apk --no-cache add ca-certificates git findutils

# Создаем директорию для проекта
WORKDIR /build

# Инициализируем модуль с явным включением модульного режима
ENV GO111MODULE=on

# Копируем исходный код сервера
COPY server/ server/

# Копируем конфигурации
COPY livekit.yaml ./livekit.yaml

# Выводим структуру директорий для отладки
RUN find /build -type d | sort
RUN cat server/main.go | head -10

# Патчим все .go файлы для исправления импортов
RUN find server -name "*.go" -type f -exec sed -i 's|"messenger/server/|"messenger/|g' {} \;

# Перемещаем файлы из server/ в корень проекта для соответствия импортам
RUN for dir in server/*; do \
      if [ -d "$dir" ]; then \
        dirname=$(basename "$dir"); \
        mkdir -p "$dirname"; \
        mv "$dir"/* "$dirname"/; \
      fi; \
    done && \
    mv server/main.go ./main.go && \
    rm -rf server

# Выводим финальную структуру для отладки
RUN find /build -type d | sort
RUN ls -la

# Создаем go.mod ПОСЛЕ реорганизации файлов
RUN go mod init messenger

# Устанавливаем все зависимости ПОСЛЕ реорганизации файлов
RUN go get -v github.com/gin-gonic/gin && \
    go get -v github.com/go-playground/validator/v10 && \
    go get -v github.com/gorilla/websocket && \
    go get -v gorm.io/driver/postgres && \
    go get -v gorm.io/gorm && \
    go get -v gorm.io/gorm/logger && \
    go get -v go.uber.org/zap && \
    go get -v go.uber.org/zap/zapcore && \
    go get -v github.com/golang-jwt/jwt/v5 && \
    go get -v github.com/redis/go-redis/v9 && \
    go get -v golang.org/x/crypto/bcrypt && \
    go mod tidy

# Собираем приложение из корня проекта
RUN CGO_ENABLED=0 GOOS=linux go build -o /build/messenger-server .

# Финальный образ
FROM alpine:latest

WORKDIR /app

# Установка необходимых пакетов
RUN apk --no-cache add ca-certificates tzdata

# Создаем директорию для конфигурации
RUN mkdir -p /app/server/config

# Копирование файлов из builder
COPY --from=builder /build/messenger-server .
COPY --from=builder /build/livekit.yaml ./

# Создаем директорию и конфигурационный файл вручную
RUN mkdir -p /app/server/config && \
    echo '{\
  "server": {\
    "host": "0.0.0.0",\
    "port": "8080",\
    "upload_dir": "./uploads",\
    "external_url": "https://chat.kikita.ru",\
    "cors": {\
      "allowed_origins": ["https://chat.kikita.ru"],\
      "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],\
      "allowed_headers": ["Origin", "Content-Type", "Accept", "Authorization"]\
    }\
  },\
  "database": {\
    "host": "10.16.52.17",\
    "port": "5432",\
    "user": "postgres",\
    "password": "postgres",\
    "dbname": "messenger",\
    "sslmode": "disable",\
    "timezone": "UTC"\
  },\
  "redis": {\
    "host": "10.16.52.18",\
    "port": "6379",\
    "enabled": true\
  },\
  "jwt": {\
    "secret": "your-secret-key-change-in-production",\
    "expiry": 24\
  },\
  "logger": {\
    "level": "debug",\
    "format": "json",\
    "output": "console"\
  },\
  "websocket": {\
    "message_buffer_size": 256,\
    "ping_interval": 30,\
    "ping_timeout": 60\
  },\
  "sfu": {\
    "host": "95.30.251.97",\
    "port": "7880",\
    "api_key": "devkey",\
    "api_secret": "devsecret",\
    "ice_servers": [\
      {\
        "urls": "stun:stun.l.google.com:19302"\
      }\
    ]\
  }\
}' > /app/server/config/config.json

# Порт для HTTP API
EXPOSE 8080

# Запуск
CMD ["./messenger-server"]
