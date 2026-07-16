"""OAuth configuration loaded from environment variables."""

import os
from dataclasses import dataclass, field


@dataclass
class GoogleOAuthConfig:
    client_id: str = field(default_factory=lambda: os.getenv("GOOGLE_CLIENT_ID", ""))
    client_secret: str = field(default_factory=lambda: os.getenv("GOOGLE_CLIENT_SECRET", ""))
    redirect_uri: str = field(default_factory=lambda: os.getenv("GOOGLE_CALLBACK_URL", ""))

    # Google OAuth 2.0 endpoints
    authorization_base_url: str = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url: str = "https://oauth2.googleapis.com/token"
    userinfo_url: str = "https://www.googleapis.com/oauth2/v2/userinfo"

    # Scopes
    scopes: list = field(default_factory=lambda: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
    ])

    @property
    def scope_string(self) -> str:
        return " ".join(self.scopes)

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.redirect_uri)


# Singleton config
google_oauth_config = GoogleOAuthConfig()