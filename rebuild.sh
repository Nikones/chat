#!/bin/bash

echo "============== Полное перестроение проекта =============="

echo "1. Остановка и удаление контейнеров..."
docker compose down -v

echo "2. Удаление образов..."
docker rmi chat-main-server chat-main-client

echo "3. Запуск сборки с нуля..."
docker compose build --no-cache

echo "4. Запуск контейнеров..."
docker compose up -d

echo "============== Перестроение завершено =============="
echo "Логи можно посмотреть командой: docker compose logs -f" 