import os
import base64
import mimetypes
from typing import Optional

def is_image_attachment(attachment: dict) -> bool:
    """Check if an attachment dict represents an image."""
    if not isinstance(attachment, dict):
        return False
    url = attachment.get("url") or ""
    ftype = (attachment.get("type") or attachment.get("content_type") or "").lower()
    filename = (attachment.get("filename") or attachment.get("name") or "")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    image_exts = {"jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif", "svg", "tiff"}
    return ftype.startswith("image/") or ext in image_exts

def attachment_display_name(attachment: dict) -> str:
    return attachment.get("filename") or attachment.get("name") or "файл"

def attachment_to_image_url(attachment: dict) -> Optional[str]:
    """
    Convert an attachment's image reference to an absolute URL or data URL.
    Returns None if conversion fails.
    """
    url = (attachment.get("url") or "").strip()
    if not url:
        return None

    # If it's already an absolute URL with http/https
    if url.startswith("http://") or url.startswith("https://"):
        return url

    # If it's a /uploads/ relative path, convert to data URL by reading the file
    if url.startswith("/uploads/"):
        # Try to find the file relative to backend or cwd
        possible_paths = [
            os.path.join(os.getcwd(), url.lstrip("/")),           # ./uploads/file
            os.path.join(os.getcwd(), "backend", url.lstrip("/")), # ./backend/uploads/file
            os.path.join(os.path.dirname(__file__), "..", url.lstrip("/")),  # relative to this file
        ]
        for base_path in [os.getcwd(), os.path.join(os.getcwd(), "backend")]:
            candidate = os.path.join(base_path, url.lstrip("/"))
            if os.path.exists(candidate):
                mime_type, _ = mimetypes.guess_type(url)
                if not mime_type:
                    mime_type = "image/jpeg"
                try:
                    with open(candidate, "rb") as f:
                        data = base64.b64encode(f.read()).decode("utf-8")
                    return f"data:{mime_type};base64,{data}"
                except Exception as e:
                    print(f"DEBUG: Failed to read {candidate}: {e}")
                break

        # If file not found, try Docker path /app/uploads/
        docker_path = os.path.join("/app", url.lstrip("/"))
        if os.path.exists(docker_path):
            mime_type, _ = mimetypes.guess_type(url)
            if not mime_type:
                mime_type = "image/jpeg"
            try:
                with open(docker_path, "rb") as f:
                    data = base64.b64encode(f.read()).decode("utf-8")
                return f"data:{mime_type};base64,{data}"
            except Exception as e:
                print(f"DEBUG: Failed to read {docker_path}: {e}")

        # If can't find file, return the absolute URL via the API
        api_url = os.environ.get("API_URL", "http://localhost:8001")
        base_api = api_url.rstrip("/")
        return f"{base_api}{url}"

    # If it's a data URL already
    if url.startswith("data:"):
        return url

    # Some other relative path, try to make absolute
    api_url = os.environ.get("API_URL", "http://localhost:8001")
    base_api = api_url.rstrip("/")
    return f"{base_api}{url}" if url.startswith("/") else url


# ─── Материалы для vision ────────────────────────────────────────────────────

VISION_HALLUCINATION_GUARD = """
ВАЖНОЕ ПРАВИЛО ДЛЯ ИЗОБРАЖЕНИЙ И ФАЙЛОВ:
- Отвечай только по тем данным, которые явно есть в тексте пользователя и в прикреплённых изображениях.
- Если изображение не загрузилось, не открылось, размыто, обрезано или по нему невозможно уверенно определить детали — так и пиши: «Я не вижу содержимое изображения достаточно ясно, поэтому не могу это определить».
- Если ты НЕ ВИДИШЬ изображение (оно не было передано или недоступно) — НЕ ВЫДУМЫВАЙ его содержимое. Напиши: «Я не вижу изображение. Пожалуйста, отправьте его ещё раз или опишите текстом».
- Не выдумывай текст на изображении, бренды, людей, эмоции, еду, цвета, количество предметов, действия, диагнозы, суммы, даты или другие детали.
- Если пользователь просит проанализировать изображение, но изображение не было передано модели или его содержимое недоступно, не давай анализ: попроси отправить изображение ещё раз или описать его текстом.
- Для еды по фото можно давать только приблизительную оценку и обязательно предупреждай, что без веса/КБЖУ расчёт примерный.
"""


def build_vision_message_parts(text: str, attachments: list[dict] | None = None) -> list[dict]:
    """
    Build LLM message content parts. Images from attachments are inlined as data URLs.
    Returns a list of parts suitable for use with OpenAI-compatible vision API.
    """
    attachments = attachments or []
    parts: list[dict] = []
    image_count = 0

    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue
        if not is_image_attachment(attachment):
            parts.append({
                "type": "text",
                "text": f"К сообщению был прикреплён файл «{attachment_display_name(attachment)}».",
            })
            continue

        image_url = attachment_to_image_url(attachment)
        if image_url:
            parts.append({"type": "image_url", "image_url": {"url": image_url}})
            image_count += 1
        else:
            parts.append({
                "type": "text",
                "text": f"К сообщению был прикреплён файл «{attachment_display_name(attachment)}», но его содержимое недоступно модели.",
            })

    if text:
        parts.append({"type": "text", "text": text})

    if image_count:
        parts.append({"type": "text", "text": VISION_HALLUCINATION_GUARD})

    return parts


def build_llm_user_message(text: str, attachments: list[dict] | None = None) -> dict | str:
    """
    Build a user message content for LLM.
    If there are images, returns {"role": "user", "content": [parts...]}
    Otherwise returns {"role": "user", "content": text}
    """
    parts = build_vision_message_parts(text, attachments)
    if len(parts) == 1 and parts[0]["type"] == "text":
        return {"role": "user", "content": parts[0]["text"]}
    return {"role": "user", "content": parts}