FROM golang:1.21-alpine AS builder

WORKDIR /app

# Установка зависимостей для сборки
RUN apk --no-cache add ca-certificates git

# Копирование файла go.mod
COPY go.mod ./

# Фиксируем только локальную версию Go
ENV GOTOOLCHAIN=local

# Копирование исходного кода
COPY . .

# Создаем файл go.sum внутри контейнера и выводим зависимости для отладки
RUN touch go.sum && go mod tidy && go list -m all

# Сборка с выводом подробной информации для отладки
RUN CGO_ENABLED=0 GOOS=linux go build -a -v -installsuffix cgo -o messenger-server ./server

# Финальный образ
FROM alpine:latest

WORKDIR /app

# Установка необходимых пакетов
RUN apk --no-cache add ca-certificates tzdata

# Копирование файлов из builder
COPY --from=builder /app/messenger-server .
COPY --from=builder /app/server/config/config.json ./server/config/
COPY --from=builder /app/livekit.yaml ./

# Порт для HTTP API
EXPOSE 8080

# Запуск
CMD ["./messenger-server"]
