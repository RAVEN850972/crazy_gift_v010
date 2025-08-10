#!/usr/bin/env python3
"""
Инициализация базы данных и создание тестового пользователя
"""

import asyncio
import sys
import os

# Добавляем путь к backend
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

async def init_database():
    """Инициализирует базу данных"""
    print("Initializing database...")
    
    try:
        from app.database import init_db
        await init_db()
        print("✓ Database tables created successfully")
        return True
    except Exception as e:
        print(f"✗ Error initializing database: {str(e)}")
        return False

async def create_test_user():
    """Создает тестового пользователя"""
    print("Creating test user...")
    
    try:
        from app.database import AsyncSessionLocal
        from app.models import User
        from app.auth import generate_referral_code
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            # Проверяем существующего пользователя
            result = await db.execute(
                select(User).where(User.telegram_id == 123456789)
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"✓ Test user already exists: ID {existing_user.id}")
                print(f"  Telegram ID: {existing_user.telegram_id}")
                print(f"  Username: {existing_user.username}")
                print(f"  Balance: {existing_user.balance_stars} stars")
                print(f"  Referral code: {existing_user.referral_code}")
                return existing_user.id
            
            # Создаем нового пользователя
            test_user = User(
                telegram_id=123456789,
                username="testuser",
                first_name="Test", 
                last_name="User",
                referral_code=generate_referral_code(123456789),
                balance_stars=10000  # Достаточно для всех тестов
            )
            
            db.add(test_user)
            await db.commit()
            await db.refresh(test_user)
            
            print(f"✓ Created test user: ID {test_user.id}")
            print(f"  Telegram ID: {test_user.telegram_id}")
            print(f"  Username: {test_user.username}")
            print(f"  Balance: {test_user.balance_stars} stars")
            print(f"  Referral code: {test_user.referral_code}")
            
            return test_user.id
            
    except Exception as e:
        print(f"✗ Error creating test user: {str(e)}")
        return None

def create_env_file():
    """Создает .env файл с минимальными настройками"""
    env_file = "../backend/.env"
    
    env_content = '''# Минимальные настройки для тестирования
TELEGRAM_BOT_TOKEN=test_token_for_development
TON_WALLET_ADDRESS=EQD2NmD_lH35jF0Z8FeGE6JvYnfR0vbM-Q8FbJ8A5a3c1234
TON_API_KEY=test_api_key
DEBUG=true
DATABASE_URL=sqlite+aiosqlite:///./database.db
CORS_ORIGINS=*
'''
    
    if not os.path.exists(env_file):
        with open(env_file, 'w') as f:
            f.write(env_content)
        print(f"✓ Created {env_file}")
    else:
        print(f"✓ .env file already exists at {env_file}")

async def main():
    """Основная функция настройки"""
    print("=" * 60)
    print("CRAZYGIFT API DATABASE SETUP")
    print("=" * 60)
    
    # 1. Создаем .env файл если его нет
    create_env_file()
    
    print()
    
    # 2. Инициализируем базу данных
    db_success = await init_database()
    
    if not db_success:
        print("\n✗ Failed to initialize database. Check backend configuration.")
        return
    
    print()
    
    # 3. Создаем тестового пользователя
    user_id = await create_test_user()
    
    print()
    print("=" * 60)
    
    if user_id:
        print("✅ SETUP COMPLETED SUCCESSFULLY!")
        print(f"Test user ID: {user_id}")
        print("\nNext steps:")
        print("1. Restart backend server: cd ../backend && python3 run.py")
        print("2. Run tests: python3 test_complete.py")
    else:
        print("❌ SETUP FAILED!")
        print("Check the error messages above.")

if __name__ == "__main__":
    asyncio.run(main())