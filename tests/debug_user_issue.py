#!/usr/bin/env python3
"""
Проверка конфигурации базы данных и синхронизация
"""

import sys
import os
from pathlib import Path
import httpx
import asyncio

# Добавляем путь к backend
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

def check_backend_config():
    """Проверяет конфигурацию backend"""
    try:
        from app.config import settings
        
        print("Backend configuration:")
        print(f"  Database URL: {settings.database_url}")
        print(f"  Debug mode: {settings.debug}")
        
        # Проверяем путь к базе данных
        if "sqlite" in settings.database_url:
            db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
            if db_path.startswith("./"):
                # Относительный путь от backend директории
                full_db_path = backend_path / db_path[2:]
            else:
                full_db_path = Path(db_path)
            
            print(f"  Actual DB path: {full_db_path}")
            print(f"  DB file exists: {full_db_path.exists()}")
            
            if full_db_path.exists():
                print(f"  DB file size: {full_db_path.stat().st_size} bytes")
            
            return str(full_db_path)
        
        return None
        
    except Exception as e:
        print(f"Config check error: {e}")
        return None

async def check_api_db_connection():
    """Проверяет подключение API к БД напрямую"""
    try:
        from app.database import AsyncSessionLocal
        from app.models import User
        from sqlalchemy import select, text
        
        print("\nAPI database connection test:")
        
        async with AsyncSessionLocal() as db:
            # Проверяем таблицы
            result = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = result.fetchall()
            print(f"  Tables in API DB: {[table[0] for table in tables]}")
            
            # Проверяем пользователей
            result = await db.execute(select(User))
            users = result.scalars().all()
            print(f"  Users in API DB: {len(users)}")
            
            for user in users:
                print(f"    User {user.id}: {user.username}, Balance: {user.balance_stars}")
                
            return len(users) > 0
            
    except Exception as e:
        print(f"API DB connection error: {e}")
        return False

def create_user_directly_in_api_db():
    """Создает пользователя напрямую в API базе данных"""
    import sqlite3
    
    # Получаем путь к БД из конфигурации
    db_path = check_backend_config()
    
    if not db_path:
        print("Cannot determine database path")
        return None
    
    try:
        # Подключаемся к той же БД что использует API
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print(f"\nWorking with database: {db_path}")
        
        # Очищаем старых пользователей
        cursor.execute("DELETE FROM users")
        print("Cleared existing users")
        
        # Вставляем нового пользователя
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        
        cursor.execute("""
            INSERT INTO users (
                telegram_id, username, first_name, last_name,
                balance_stars, balance_ton, referral_code,
                total_cases_opened, total_spent_stars, total_earned_stars,
                created_at, updated_at, last_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            123456789, 'testuser', 'Test', 'User',
            10000, 0.0, 'CG123TEST',
            0, 0, 0,
            now, now, now
        ))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        # Проверяем
        cursor.execute("SELECT id, username, balance_stars FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        conn.close()
        
        if user:
            print(f"✅ Created user in API database: ID {user[0]}, Balance {user[2]}")
            return user[0]
        else:
            print("❌ Failed to create user in API database")
            return None
            
    except Exception as e:
        print(f"❌ Error creating user in API DB: {e}")
        return None

async def test_api_immediately(user_id):
    """Тестирует API сразу после создания пользователя"""
    print(f"\nTesting API immediately with user {user_id}...")
    
    # Небольшая задержка для синхронизации
    await asyncio.sleep(1)
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Тестируем баланс
            response = await client.get(f"http://localhost:8000/api/users/{user_id}/balance")
            print(f"Balance API: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ SUCCESS: Balance {data['balance_stars']} stars")
                return True
            else:
                print(f"❌ Error: {response.json()}")
                
                # Попробуем еще раз через несколько секунд
                print("Retrying in 3 seconds...")
                await asyncio.sleep(3)
                
                response2 = await client.get(f"http://localhost:8000/api/users/{user_id}/balance")
                print(f"Retry result: {response2.status_code}")
                
                if response2.status_code == 200:
                    data = response2.json()
                    print(f"✅ SUCCESS on retry: Balance {data['balance_stars']} stars")
                    return True
                
                return False
                
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False

async def run_quick_test(user_id):
    """Запускает быстрый тест функционала"""
    if not user_id:
        return
        
    print(f"\nRunning quick functionality test with user {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Тест 1: Открытие кейса
            response = await client.post(
                f"http://localhost:8000/api/cases/1/open",
                json={"user_id": user_id}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data['success']:
                    print(f"✅ Case opened! Won: {data['item']['item_name']}")
                    print(f"✅ New balance: {data['new_balance']}")
                    
                    # Тест 2: Проверяем инвентарь
                    inv_response = await client.get(f"http://localhost:8000/api/inventory/{user_id}")
                    if inv_response.status_code == 200:
                        items = inv_response.json()
                        print(f"✅ Inventory: {len(items)} items")
                        
                        return True
                else:
                    print(f"⚠️ Case opening failed: {data['message']}")
            else:
                print(f"❌ Case API error: {response.json()}")
        
        return False
        
    except Exception as e:
        print(f"❌ Quick test error: {e}")
        return False

async def main():
    print("=== Database Configuration Check & Fix ===\n")
    
    # Шаг 1: Проверяем конфигурацию
    db_path = check_backend_config()
    
    # Шаг 2: Проверяем подключение API к БД
    api_db_ok = await check_api_db_connection()
    
    # Шаг 3: Создаем пользователя в правильной БД
    print("\nCreating user in correct database...")
    user_id = create_user_directly_in_api_db()
    
    if user_id:
        # Шаг 4: Тестируем API сразу
        api_works = await test_api_immediately(user_id)
        
        if api_works:
            # Шаг 5: Быстрый функциональный тест
            full_test = await run_quick_test(user_id)
            
            if full_test:
                print(f"\n🎉 COMPLETE SUCCESS! User {user_id} is fully functional")
                print("\nYou can now run: python3 test_complete.py")
            else:
                print(f"\n⚠️ User works but some functions failed")
        else:
            print(f"\n❌ API still doesn't see user {user_id}")
    else:
        print("\n❌ Failed to create user")

if __name__ == "__main__":
    asyncio.run(main())