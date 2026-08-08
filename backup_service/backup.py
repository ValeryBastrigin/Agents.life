import os
import subprocess
import logging
from datetime import datetime, timezone, timedelta
import boto3
from botocore.exceptions import BotoCoreError, ClientError

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("db_backup")

# Конфигурация из переменных окружения
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "lifeagent")
DB_USER = os.getenv("DB_USER", "lifeagent")
DB_PASSWORD = os.getenv("DB_PASSWORD", "lifeagent_password")

S3_ENDPOINT = os.getenv("S3_ENDPOINT", "https://storage.yandexcloud.net")
S3_REGION = os.getenv("S3_REGION", "ru-central1")
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))

def create_backup():
    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    filename = f"backup-{timestamp}.sql.gz"
    filepath = f"/tmp/{filename}"

    logger.info(f"Начало создания дампа базы данных {DB_NAME}...")

    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    # Команда pg_dump со сжатием в gzip
    cmd = [
        "pg_dump",
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-d", DB_NAME,
        "--clean",
        "--if-exists"
    ]

    try:
        with open(filepath, "wb") as f_out:
            # Запускаем pg_dump, пайпим вывод в gzip
            p1 = subprocess.Popen(cmd, stdout=subprocess.PIPE, env=env)
            p2 = subprocess.Popen(["gzip"], stdin=p1.stdout, stdout=f_out)
            p1.stdout.close()
            p2.communicate()

            if p2.returncode != 0:
                raise RuntimeError(f"Ошибка при создании gzip архива (код {p2.returncode})")

        file_size = os.path.getsize(filepath)
        logger.info(f"Дамп успешно создан: {filepath} ({file_size} байт)")
        return filepath, filename

    except Exception as e:
        logger.error(f"Ошибка при создании дампа базы данных: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)
        raise e

def upload_to_s3(filepath, filename):
    if not all([S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
        logger.error("Не заданы параметры S3 (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME)")
        raise ValueError("Отсутствуют креды для S3")

    s3_key = f"backups/{filename}"
    logger.info(f"Загрузка файла в S3: s3://{S3_BUCKET_NAME}/{s3_key}...")

    session = boto3.session.Session()
    s3_client = session.client(
        service_name='s3',
        endpoint_url=S3_ENDPOINT,
        region_name=S3_REGION,
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY
    )

    try:
        with open(filepath, "rb") as f_in:
            s3_client.upload_fileobj(f_in, S3_BUCKET_NAME, s3_key)
        logger.info("Файл успешно загружен в S3.")
    except (BotoCoreError, ClientError) as e:
        logger.error(f"Ошибка AWS/S3 при загрузке: {e}")
        raise e
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при загрузке в S3: {e}")
        raise e

def cleanup_old_backups():
    if not all([S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
        return

    logger.info(f"Проверка и удаление бэкапов старше {RETENTION_DAYS} дней...")
    session = boto3.session.Session()
    s3_client = session.client(
        service_name='s3',
        endpoint_url=S3_ENDPOINT,
        region_name=S3_REGION,
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY
    )

    try:
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix="backups/")
        if "Contents" not in response:
            logger.info("В папке backups/ нет файлов.")
            return

        now = datetime.now(timezone.utc)
        threshold = now - timedelta(days=RETENTION_DAYS)

        objects_to_delete = []
        for obj in response["Contents"]:
            key = obj["Key"]
            last_modified = obj["LastModified"]

            if last_modified < threshold:
                objects_to_delete.append({"Key": key})

        if objects_to_delete:
            logger.info(f"Найдено устаревших бэкапов для удаления: {len(objects_to_delete)}")
            # delete_objects принимает до 1000 объектов за раз
            for i in range(0, len(objects_to_delete), 1000):
                chunk = objects_to_delete[i:i+1000]
                s3_client.delete_objects(
                    Bucket=S3_BUCKET_NAME,
                    Delete={"Objects": chunk}
                )
            logger.info("Устаревшие бэкапы успешно удалены.")
        else:
            logger.info("Устаревших бэкапов не обнаружено.")

    except Exception as e:
        logger.error(f"Ошибка при очистке старых бэкапов: {e}")

def run_backup_pipeline():
    filepath = None
    try:
        logger.info("=== Старт процесса резервного копирования ===")
        filepath, filename = create_backup()
        upload_to_s3(filepath, filename)
        cleanup_old_backups()
        logger.info("=== Процесс резервного копирования успешно завершен ===")
    except Exception as e:
        logger.error("=== Процесс резервного копирования завершился с ошибкой ===")
    finally:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Локальный временный файл удален: {filepath}")

if __name__ == "__main__":
    run_backup_pipeline()
