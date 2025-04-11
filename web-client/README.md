# Мессенджер Кикиты - Веб-клиент

## Инструкция по развертыванию

### Структура проекта

- `src/` - исходный код React-приложения
  - `components/` - React-компоненты
  - `contexts/` - React-контексты для управления состоянием
  - `api/` - API клиенты для взаимодействия с бэкендом

### Шаги по развертыванию

1. Склонируйте репозиторий на сервер:
   ```bash
   git clone https://github.com/username/messenger.git /opt/chat
   ```

2. Перейдите в директорию проекта:
   ```bash
   cd /opt/chat
   ```

3. Создайте контейнеры и запустите сервисы:
   ```bash
   docker compose down -v
   docker compose build
   docker compose up -d
   ```

4. Проверьте статус контейнеров:
   ```bash
   docker ps
   ```

5. Настройте Nginx для проксирования запросов:
   ```
   server {
     listen 80;
     server_name chat.kikita.ru;
     
     location / {
       proxy_pass http://10.16.52.16:80;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
     
     location /api {
       proxy_pass http://10.16.52.15:8080;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
     
     location /ws {
       proxy_pass http://10.16.52.15:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
     }
   }
   ```

6. Добавьте правила NAT в маршрутизаторе Mikrotik:
   ```
   /ip firewall nat add chain=dstnat action=dst-nat to-addresses=10.16.52.16 to-ports=80 protocol=tcp dst-port=55580
   ```

7. Откройте в браузере `https://chat.kikita.ru` и следуйте инструкциям для настройки.

## Обновление системы

Для обновления клиента:

```bash
cd /opt/chat
git pull
docker compose down
docker compose build client
docker compose up -d
```

## Восстановление системы

В случае проблем с системой:

1. Проверьте логи сервера:
   ```bash
   docker logs chat-server-1
   ```

2. Проверьте логи клиента:
   ```bash
   docker logs chat-client-1
   ```

3. Для полного сброса системы (удаляет все данные):
   ```bash
   docker compose down -v
   docker volume prune -f
   docker compose up -d
   ``` 