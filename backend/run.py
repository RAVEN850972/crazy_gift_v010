#!/usr/bin/env python3
"""
Скрипт для запуска CrazyGift API сервера
"""

import uvicorn
import asyncio
import sys
from pathlib import Path

# Добавляем путь к приложению
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings


async def main():
    """Основная функция запуска"""
    print("🚀 Starting CrazyGift API Server...")
    print(f"📊 Debug mode: {settings.debug}")
    print(f"🗄️  Database: {settings.database_url.split('://')[0]}")
    print(f"📱 Telegram Bot: {'✅ Configured' if settings.telegram_bot_token else '❌ Not configured'}")
    print(f"💰 TON Wallet: {'✅ Configured' if settings.ton_wallet_address else '❌ Not configured'}")
    print("-" * 50)
    
    # Запускаем сервер
    config = uvicorn.Config(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info" if settings.debug else "warning",
        reload_dirs=["app"] if settings.debug else None,
    )
    
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        sys.exit(1)