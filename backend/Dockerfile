# Бэкенд: FastAPI приложение
FROM python:3.11-slim
WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей
# Build context = корень проекта (.), поэтому пути от корня
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Копирование всего бэкенда
COPY backend/ ./backend/
COPY backend/src/ ./src/

# Создаём директорию для загружаемых файлов
RUN mkdir -p /app/uploads

# Указываем, что приложение слушает 8000 порт
EXPOSE 8000

# Запуск FastAPI
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]