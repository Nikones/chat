#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Останавливаем все контейнеры...${NC}"
docker compose down

echo -e "${YELLOW}Применяем изменения в настройках NAT на Mikrotik...${NC}"
echo -e "${YELLOW}Выполните эти команды на вашем Mikrotik:${NC}"
echo -e "${RED}/ip firewall nat edit 6${NC}"
echo -e "${RED}set to-ports=9090${NC}"
echo -e "${RED}/ip firewall nat edit 7${NC}"
echo -e "${RED}set to-ports=9091${NC}"

echo -e "${YELLOW}Пересобираем образы...${NC}"
docker compose build

echo -e "${YELLOW}Запускаем контейнеры...${NC}"
docker compose up -d

echo -e "${YELLOW}Ожидаем запуска сервисов (10 сек)...${NC}"
sleep 10

echo -e "${GREEN}Статус контейнеров:${NC}"
docker compose ps

echo -e "${GREEN}Логи сервера (последние 20 строк):${NC}"
docker logs chat-server-1 --tail 20

echo -e "${GREEN}Проверяем доступность нового API:${NC}"
curl -s http://localhost:9090/api/system/status | cat

echo -e "${GREEN}Готово! Мессенджер доступен по адресу: https://chat.kikita.ru${NC}"
echo -e "${YELLOW}При первом запуске откроется страница настройки для создания администратора${NC}" 