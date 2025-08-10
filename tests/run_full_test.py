#!/usr/bin/env python3
"""
Простой запуск тестов с созданием пользователя
"""

import asyncio
import subprocess
import sys

async def run_tests():
    print("=== CrazyGift API Test Runner ===")
    
    # Шаг 1: Создаем тестового пользователя
    print("\nStep 1: Creating test user...")
    try:
        result = subprocess.run([sys.executable, "create_test_user.py"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Test user created")
            print(result.stdout)
        else:
            print("✗ Failed to create test user")
            print(result.stderr)
            return
    except Exception as e:
        print(f"Error creating test user: {e}")
        return
    
    # Шаг 2: Запускаем тесты
    print("\nStep 2: Running tests...")
    try:
        result = subprocess.run([sys.executable, "test_complete.py"], 
                              capture_output=False, text=True)
    except Exception as e:
        print(f"Error running tests: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())
