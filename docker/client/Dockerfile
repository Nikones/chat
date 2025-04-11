# Этап сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY web-client/package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта
COPY web-client/ ./

# Создаем директорию assets и заглушку для logo.png, если они не существуют
RUN mkdir -p /app/src/assets && \
    touch /app/src/assets/logo.png

# Создаем директорию для полифиллов, если она еще не существует
RUN mkdir -p /app/src/polyfills

# Строим приложение
RUN npm run build

# Этап работы
FROM nginx:stable-alpine

# Копируем собранные файлы из предыдущего этапа
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"] 