"""Google OAuth 2.0 service: build auth URL, exchange code for token, fetch user profile."""

import urllib.parse
from fastapi import HTTPException
import httpx

from .config import google_oauth_config


def build_authorization_url(state: str = "") -> str:
    """Build the Google OAuth 2.0 authorization URL."""
    if not google_oauth_config.is_configured():
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured properly. Check GOOGLE_CLIENT_ID, "
                   "GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL in .env.",
        )

    params = {
        "client_id": google_oauth_config.client_id,
        "redirect_uri": google_oauth_config.redirect_uri,
        "response_type": "code",
        "scope": google_oauth_config.scope_string,
        "access_type": "offline",
        "prompt": "select_account",
    }

    if state:
        params["state"] = state

    query_string = urllib.parse.urlencode(params)
    return f"{google_oauth_config.authorization_base_url}?{query_string}"


async def exchange_code_for_token(code: str) -> dict:
    """Exchange the authorization code for an access token."""
    data = {
        "code": code,
        "client_id": google_oauth_config.client_id,
        "client_secret": google_oauth_config.client_secret,
        "redirect_uri": google_oauth_config.redirect_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(google_oauth_config.token_url, data=data)

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to exchange code for token: {response.text}",
        )

    return response.json()


async def fetch_user_profile(access_token: str) -> dict:
    """Fetch the user's Google profile using the access token."""
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(google_oauth_config.userinfo_url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch user profile: {response.text}",
        )

    return response.json()


def format_user_profile(profile: dict) -> dict:
    """Extract and return only the fields we care about from the Google profile."""
    return {
        "google_id": profile.get("id"),
        "email": profile.get("email"),
        "name": profile.get("name"),
        "given_name": profile.get("given_name"),
        "family_name": profile.get("family_name"),
        "picture": profile.get("picture"),
        "verified_email": profile.get("verified_email", False),
        "locale": profile.get("locale", ""),
    }