# Этап 1: Сборка фронтенда
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Этап 2: Финальный образ с бэкендом и статической сборкой фронта
FROM python:3.11-slim
WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Копирование бэкенда
COPY backend/ ./backend/

# Копирование src модуля
COPY backend/src/ ./src/

# Копирование скомпилированного фронтенда из первого этапа
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Создаём директорию для загружаемых файлов
RUN mkdir -p /app/uploads

# Указываем, что приложение слушает 8000 порт
EXPOSE 8000

# Запуск только бэкенда (FastAPI), который будет раздавать статику
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
