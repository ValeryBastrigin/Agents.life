"""Google OAuth 2.0 API routes.

- GET  /auth/google     → redirects user to Google consent screen
- GET  /auth/callback   → callback endpoint for Google to send the auth code
"""

import os

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import google_oauth_config
from .service import (
    build_authorization_url,
    exchange_code_for_token,
    fetch_user_profile,
    format_user_profile,
)
from src.database import get_db, async_session
from src.models import User

router = APIRouter(tags=["auth"])

# URL of the frontend app (redirect target after login)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@router.get("/auth/google")
async def auth_google():
    """
    Redirect the user to Google's OAuth 2.0 consent screen.
    """
    if not google_oauth_config.is_configured():
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured properly.",
        )

    authorization_url = build_authorization_url()
    return RedirectResponse(url=authorization_url, status_code=302)


@router.get("/auth/callback")
async def auth_callback(code: str = Query(..., description="Authorization code from Google")):
    """
    Callback endpoint that Google redirects to after user consent.
    Exchanges the code for an access token, fetches the user profile,
    creates or retrieves the user in the database, and redirects back
    to the frontend with user data as query params.

    This path MUST match GOOGLE_CALLBACK_URL in .env
    (currently http://localhost:8001/auth/callback).
    """
    # 1. Exchange code for access token
    token_data = await exchange_code_for_token(code)
    access_token = token_data.get("access_token")

    if not access_token:
        # Redirect back to frontend with error
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=no_token",
            status_code=302,
        )

    # 2. Fetch user profile with the access token
    raw_profile = await fetch_user_profile(access_token)
    profile = format_user_profile(raw_profile)

    # 3. Log the user data to the console
    print("=== Google OAuth Login ===")
    print(f"Email: {profile['email']}")
    print(f"Name:  {profile['name']}")
    print(f"Google ID: {profile['google_id']}")
    print(f"Picture: {profile['picture']}")
    print("==========================")

    # 4. Create or retrieve user in database
    async with async_session() as session:
        # Try to find user by google_id first
        result = await session.execute(
            select(User).where(User.google_id == profile['google_id'])
        )
        user = result.scalar_one_or_none()

        if not user:
            # Try to find user by email (in case they already exist but without google_id)
            result = await session.execute(
                select(User).where(User.email == profile['email'])
            )
            user = result.scalar_one_or_none()

            if user:
                # Update existing user with google_id
                user.google_id = profile['google_id']
                user.avatar_url = profile['picture']
                await session.commit()
            else:
                # Create new user
                user = User(
                    username=profile['email'].split('@')[0],  # Use email prefix as username
                    email=profile['email'],
                    password_hash="oauth_user",  # Placeholder for OAuth users
                    google_id=profile['google_id'],
                    avatar_url=profile['picture'],
                    token_balance=1000,
                    plan="FREE",
                    theme_preference="light"
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)

    # 5. Redirect back to frontend with user data as query params
    query_params = (
        f"success=true"
        f"&email={profile['email']}"
        f"&name={profile['name']}"
        f"&google_id={profile['google_id']}"
        f"&picture={profile['picture']}"
        f"&user_id={user.id}"
    )
    return RedirectResponse(
        url=f"{FRONTEND_URL}/login?{query_params}",
        status_code=302,
    )