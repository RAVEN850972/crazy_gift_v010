#!/usr/bin/env python3
"""
Простое создание тестового пользователя
"""

import httpx
import asyncio

async def create_user_via_sql():
    """Создает пользователя через прямой SQL запрос"""
    import sys
    import os
    from pathlib import Path
    
    # Добавляем путь к backend
    backend_path = Path(__file__).parent.parent / "backend"
    sys.path.insert(0, str(backend_path))
    
    try:
        from app.database import AsyncSessionLocal
        from sqlalchemy import text
        
        async with AsyncSessionLocal() as db:
            # Проверяем есть ли пользователи
            result = await db.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            print(f"Current users in database: {count}")
            
            if count > 0:
                # Получаем первого пользователя
                result = await db.execute(text("SELECT id, telegram_id, balance_stars FROM users LIMIT 1"))
                user = result.first()
                print(f"Found existing user: ID {user[0]}, Telegram ID {user[1]}, Balance {user[2]}")
                return user[0]
            
            # Создаем нового пользователя простым SQL
            await db.execute(text("""
                INSERT INTO users (telegram_id, username, first_name, last_name, balance_stars, referral_code, created_at, last_active)
                VALUES (123456789, 'testuser', 'Test', 'User', 10000, 'CG12345', datetime('now'), datetime('now'))
            """))
            
            await db.commit()
            
            # Получаем ID созданного пользователя
            result = await db.execute(text("SELECT id FROM users WHERE telegram_id = 123456789"))
            user_id = result.scalar()
            
            print(f"✓ Created test user with ID: {user_id}")
            return user_id
            
    except Exception as e:
        print(f"SQL method failed: {e}")
        return None

async def create_user_via_api():
    """Создает пользователя через прямой вызов API функции"""
    import sys
    import os
    from pathlib import Path
    
    backend_path = Path(__file__).parent.parent / "backend"
    sys.path.insert(0, str(backend_path))
    
    try:
        from app.database import AsyncSessionLocal
        from app.models import User
        from datetime import datetime
        
        async with AsyncSessionLocal() as db:
            # Проверяем существующих пользователей
            from sqlalchemy import select
            result = await db.execute(select(User))
            existing_users = result.scalars().all()
            
            if existing_users:
                user = existing_users[0]
                print(f"Found existing user: ID {user.id}")
                return user.id
            
            # Создаем нового пользователя
            new_user = User(
                telegram_id=123456789,
                username="testuser",
                first_name="Test", 
                last_name="User",
                balance_stars=10000,
                referral_code="CG12345",
                created_at=datetime.utcnow(),
                last_active=datetime.utcnow()
            )
            
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            
            print(f"✓ Created user via API: ID {new_user.id}")
            return new_user.id
            
    except Exception as e:
        print(f"API method failed: {e}")
        return None

async def verify_user_works(user_id):
    """Проверяет что пользователь работает через API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://localhost:8000/api/users/{user_id}/balance")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ User verification successful - Balance: {data['balance_stars']} stars")
                return True
            else:
                print(f"❌ User verification failed: {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

async def main():
    print("=== Creating Test User for CrazyGift API ===\n")
    
    # Метод 1: Через SQL
    print("Method 1: Direct SQL...")
    user_id = await create_user_via_sql()
    
    if not user_id:
        # Метод 2: Через API модели
        print("\nMethod 2: Via API models...")
        user_id = await create_user_via_api()
    
    if user_id:
        print(f"\n🎉 Test user ready! ID: {user_id}")
        
        # Проверяем что API видит пользователя
        print("\nVerifying user through API...")
        success = await verify_user_works(user_id)
        
        if success:
            print(f"\n✅ SUCCESS! You can now run tests with user ID {user_id}")
            print("Run: python3 test_complete.py")
        else:
            print(f"\n⚠️ User created but API verification failed")
    else:
        print("\n❌ Failed to create test user")

if __name__ == "__main__":
    asyncio.run(main())