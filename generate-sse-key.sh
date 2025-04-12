#!/bin/bash

# Создаем ровно 32 байта случайных данных с помощью openssl
# и кодируем их в base64 для использования в SSE_KEY_BASE64
KEY=$(openssl rand -base64 32 | head -c 32)
BASE64_KEY=$(echo -n "$KEY" | base64)

echo "Сгенерирован ключ для AES-256 (32 байта):"
echo "SSE_KEY_BASE64=$BASE64_KEY"

# Проверка длины ключа после декодирования
DECODED_LENGTH=$(echo -n "$BASE64_KEY" | base64 -d | wc -c)
echo "Длина декодированного ключа: $DECODED_LENGTH байт"

# Использование в .env файле
echo ""
echo "Чтобы обновить .env файл, выполните команду:"
echo "sed -i 's/^SSE_KEY_BASE64=.*/SSE_KEY_BASE64=$BASE64_KEY/' .env"
echo ""
echo "Чтобы обновить docker-compose.yml, проверьте переменные окружения SSE_KEY_BASE64 и SERVER_ENCRYPTION_KEY" 