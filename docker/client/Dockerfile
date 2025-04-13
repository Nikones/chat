# Этап сборки
FROM node:16-alpine AS build

WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY web-client/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта
COPY web-client/ ./

# Создаем директорию assets и заглушку для logo.png, если они не существуют
RUN mkdir -p /app/src/assets && \
    touch /app/src/assets/logo.png

# Создаем директорию для полифиллов, если она еще не существует
RUN mkdir -p /app/src/polyfills

# Устанавливаем переменные окружения для режима разработки
ENV NODE_ENV=development
ENV REACT_APP_API_URL=http://localhost:9095
ENV REACT_APP_WS_URL=ws://localhost:9091

# Строим приложение в режиме разработки для получения полных сообщений об ошибках
RUN npm run build

# Этап работы
FROM nginx:alpine

# Копируем собранные файлы из предыдущего этапа
COPY --from=build /app/build/ /usr/share/nginx/html/

# Копируем websocket-test.html для диагностики WebSocket
COPY websocket-test.html /usr/share/nginx/html/

# Копируем конфигурацию nginx
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

# Добавляем скрипт для включения режима отладки в консоли браузера
RUN echo 'console.log("Debug mode enabled");' > /usr/share/nginx/html/debug.js

# Создаем пустые директории для логов
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log && \
    touch /var/log/nginx/error.log

# Подменяем стандартную страницу 404
RUN echo "<!DOCTYPE html><html><head><title>404 - Файл не найден</title></head><body><h1>404 - Файл не найден</h1><p>Запрошенная страница не существует.</p></body></html>" > /usr/share/nginx/html/404.html

# Проверяем конфигурацию Nginx при запуске
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/nginx-status || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 