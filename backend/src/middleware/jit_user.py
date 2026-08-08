import re
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from src.database import async_session
from src.models import User
from sqlalchemy import select

class UserAutoCreateMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract user_id from path if present (e.g., /api/events/{user_id}, /api/user/{user_id}/..., etc.)
        path = request.url.path
        query_params = request.query_params
        
        user_id = None
        
        # 1. Try to find user_id in path parameters using regex matching common patterns
        # Patterns like: /api/events/123, /api/user/123, /api/notes/123, /api/obligations/123, etc.
        # Match segment that looks like an integer ID
        path_segments = path.strip("/").split("/")
        
        # Look for known route patterns or extract any integer segment following specific keywords or general patterns
        # E.g., /api/user/{user_id} or /api/events/{user_id} or /{user_id}
        for i, segment in enumerate(path_segments):
            if segment.isdigit():
                user_id = int(segment)
                break
            # Also handle cases like /user/{user_id}/...
            if i > 0 and path_segments[i-1] in ["user", "events", "reminders", "notes", "obligations", "statements", "portfolio", "mood", "therapy-sessions", "agent-settings"]:
                if segment.isdigit():
                    user_id = int(segment)
                    break

        # 2. If not in path, check query parameters (?user_id=123)
        if not user_id and "user_id" in query_params:
            try:
                user_id = int(query_params["user_id"])
            except ValueError:
                pass

        # 3. If user_id is identified, ensure user exists in database
        if user_id and user_id > 0:
            try:
                async with async_session() as session:
                    result = await session.execute(select(User).where(User.id == user_id))
                    user = result.scalar_one_or_none()
                    if not user:
                        # Just-In-Time create user
                        new_user = User(
                            id=user_id,
                            username=f"user_{user_id}",
                            email=f"user_{user_id}@lifeagent.com",
                            password_hash="hashed_password_placeholder",
                            token_balance=1000,
                            theme_preference="light"
                        )
                        session.add(new_user)
                        await session.commit()
                        print(f"JIT Middleware: Auto-created user with ID {user_id}")
            except Exception as e:
                print(f"JIT Middleware error checking/creating user {user_id}: {e}")

        response = await call_next(request)
        return response
