#!/usr/bin/env python3
"""
Тестирование системы авторизации через Telegram WebApp
"""

import httpx
import json
import hmac
import hashlib
import time
from urllib.parse import urlencode

# Конфигурация
API_BASE = "http://localhost:8000/api"
BOT_TOKEN = "8450793380:AAEgdOJkL0_ZBOw01KOevq9_kAXY04iug3A"  # Замените на реальный токен

def generate_telegram_auth_data(user_data):
    """Генерирует корректные данные авторизации Telegram WebApp"""
    auth_date = int(time.time())
    
    # Базовые данные пользователя
    params = {
        'auth_date': str(auth_date),
        'user': json.dumps(user_data),
        'query_id': 'AAHdF6IQAAAAAN0XohDhrOrc',
    }
    
    # Создаем строку для подписи
    check_string = '\n'.join(f"{key}={value}" for key, value in sorted(params.items()))
    
    # Создаем hash
    secret_key = hmac.new("WebAppData".encode(), BOT_TOKEN.encode(), hashlib.sha256).digest()
    hash_value = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    
    # Собираем init_data
    params['hash'] = hash_value
    init_data = urlencode(params)
    
    return init_data

async def test_user_auth():
    """Тестирует авторизацию пользователя"""
    print("Testing user authentication...")
    
    # Тестовые данные пользователя
    test_user = {
        "id": 123456789,
        "first_name": "Test",
        "last_name": "User",
        "username": "testuser",
        "language_code": "en"
    }
    
    try:
        # Генерируем данные авторизации
        init_data = generate_telegram_auth_data(test_user)
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/users/auth",
                json={"init_data": init_data}
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: User authenticated")
                print(f"User ID: {data['user']['id']}")
                print(f"Telegram ID: {data['user']['telegram_id']}")
                print(f"Balance: {data['user']['balance_stars']} stars")
                print(f"Referral code: {data['user']['referral_code']}")
                return data['user']
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_user_profile(user_id):
    """Тестирует получение профиля пользователя"""
    print(f"\nTesting user profile for ID {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/users/{user_id}/profile")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Profile retrieved")
                print(f"Total cases opened: {data['total_cases_opened']}")
                print(f"Total spent: {data['total_spent_stars']} stars")
                print(f"Total earned: {data['total_earned_stars']} stars")
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_user_stats(user_id):
    """Тестирует получение статистики пользователя"""
    print(f"\nTesting user stats for ID {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/users/{user_id}/stats")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Stats retrieved")
                print(f"Inventory items: {data['inventory']['total_items']}")
                print(f"Referrals: {data['referrals_count']}")
                print(f"Member since: {data['member_since']}")
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def main():
    """Основная функция тестирования авторизации"""
    print("=" * 50)
    print("TESTING AUTHENTICATION MODULE")
    print("=" * 50)
    
    # Тестируем авторизацию
    user = await test_user_auth()
    
    if user:
        user_id = user['id']
        
        # Тестируем профиль
        await test_user_profile(user_id)
        
        # Тестируем статистику
        await test_user_stats(user_id)
        
        print(f"\nAuthentication tests completed for user {user_id}")
    else:
        print("\nAuthentication failed - skipping other tests")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())