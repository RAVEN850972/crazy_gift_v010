import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database settings
    database_url: str = "sqlite+aiosqlite:///./database.db"
    # Для PostgreSQL (когда понадобится):
    # database_url: str = "postgresql+asyncpg://user:password@localhost/crazygift"
    
    # Security
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Telegram settings
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""
    
    # TON settings
    ton_api_key: str = ""
    ton_wallet_address: str = ""
    ton_testnet: bool = True  # Для тестирования
    
    # Application settings
    debug: bool = True
    app_name: str = "CrazyGift API"
    app_version: str = "1.0.0"
    
    # CORS settings - используем строку вместо списка
    cors_origins: str = "*"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> List[str]:
        """Преобразует строку CORS origins в список"""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


# Глобальный экземпляр настроек
settings = Settings()

# Проверка обязательных настроек
def validate_settings():
    """Проверяет наличие обязательных настроек"""
    errors = []
    
    if not settings.telegram_bot_token:
        errors.append("TELEGRAM_BOT_TOKEN is required")
    
    if not settings.ton_wallet_address:
        errors.append("TON_WALLET_ADDRESS is required")
    
    if errors:
        raise ValueError(f"Configuration errors: {', '.join(errors)}")

# Автоматическая проверка при импорте (только если не в тестах)
if not os.getenv("TESTING"):
    try:
        validate_settings()
    except ValueError as e:
        print(f"⚠️  Warning: {e}")
        print("📝 Please create .env file with required settings")