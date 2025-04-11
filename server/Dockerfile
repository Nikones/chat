FROM golang:1.22-alpine AS builder

# Установка зависимостей для сборки
RUN apk --no-cache add ca-certificates git findutils

# Создаем корневую директорию для правильного импорта
WORKDIR /build

# Сначала копируем только файлы go.mod и go.sum для кэширования зависимостей
COPY go.mod go.sum* ./

# Копируем все файлы исходного кода
COPY . .

# Заменяем пути импорта с messenger/server/* на messenger/* в исходных файлах
RUN find . -type f -name "*.go" -exec sed -i 's|"messenger/server/|"messenger/|g' {} \;

# Устанавливаем зависимости для обновленных путей
RUN go get -v ./...

# Устанавливаем совместимую версию проблемной зависимости
RUN go get github.com/rogpeppe/go-internal@v1.10.0

# Обновляем go.mod и go.sum
RUN go mod tidy

# Устанавливаем конкретные версии зависимостей
RUN go get github.com/gin-gonic/gin@v1.9.1 && \
    go get github.com/go-playground/validator/v10@v10.14.0 && \
    go get github.com/golang-jwt/jwt/v5@v5.2.0 && \
    go get github.com/gorilla/websocket@v1.5.1 && \
    go get github.com/redis/go-redis/v9@v9.4.0 && \
    go get go.uber.org/zap@v1.26.0 && \
    go get golang.org/x/crypto@v0.14.0 && \
    go get gorm.io/driver/postgres@v1.5.4 && \
    go get gorm.io/gorm@v1.25.5 && \
    # Явно добавляем транзитивные зависимости
    go get github.com/bytedance/sonic@v1.9.1 && \
    go get github.com/chenzhuoyu/base64x@v0.0.0-20221115062448-fe3a3abad311 && \
    go get github.com/gabriel-vasile/mimetype@v1.4.2 && \
    go get github.com/go-playground/locales@v0.14.1 && \
    go get github.com/go-playground/universal-translator@v0.18.1

# Загружаем все зависимости и исправляем go.sum
RUN go mod download && go mod tidy

# Проверяем исходный код перед сборкой
RUN go vet ./...

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /build/messenger-server .

# Финальный образ
FROM alpine:latest

WORKDIR /app

# Установка необходимых пакетов
RUN apk --no-cache add ca-certificates tzdata

# Создаем директории
RUN mkdir -p /app/config /app/uploads /app/logs

# Копирование файлов из builder
COPY --from=builder /build/messenger-server .
COPY --from=builder /build/config /app/config

# Порт для HTTP API и WebSocket
EXPOSE 9090
EXPOSE 9091

# Запуск
CMD ["./messenger-server"]