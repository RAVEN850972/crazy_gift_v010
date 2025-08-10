#!/usr/bin/env python3
"""
Тестирование системных функций API
"""

import httpx
import asyncio

# Конфигурация
API_BASE = "http://localhost:8000"

async def test_health_check():
    """Тестирует проверку состояния системы"""
    print("Testing health check...")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{API_BASE}/health")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: System is healthy")
                print(f"Status: {data['status']}")
                print(f"Version: {data['version']}")
                print(f"Timestamp: {data['timestamp']}")
                return True
            else:
                print(f"ERROR: {response.text}")
                return False
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return False

async def test_root_endpoint():
    """Тестирует корневой эндпоинт"""
    print("\nTesting root endpoint...")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{API_BASE}/")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Root endpoint working")
                print(f"Message: {data['message']}")
                print(f"Version: {data['version']}")
                print(f"Status: {data['status']}")
                return True
            else:
                print(f"ERROR: {response.text}")
                return False
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return False

async def test_public_stats():
    """Тестирует публичную статистику"""
    print("\nTesting public stats...")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{API_BASE}/api/stats")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Public stats retrieved")
                print(f"Total users: {data['total_users']}")
                print(f"Total cases opened: {data['total_cases_opened']}")
                print(f"Active cases: {data['active_cases']}")
                print(f"Online now: {data['online_now']}")
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_api_endpoints():
    """Тестирует доступность основных API эндпоинтов"""
    print("\nTesting API endpoints availability...")
    
    endpoints = [
        "/api/cases/",
        "/api/cases/categories",
        "/api/cases/stats"
    ]
    
    results = {}
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for endpoint in endpoints:
                try:
                    response = await client.get(f"{API_BASE}{endpoint}")
                    results[endpoint] = {
                        "status": response.status_code,
                        "success": response.status_code == 200
                    }
                    status_icon = "✓" if response.status_code == 200 else "✗"
                    print(f"  {status_icon} {endpoint}: {response.status_code}")
                    
                except Exception as e:
                    results[endpoint] = {
                        "status": "ERROR",
                        "success": False,
                        "error": str(e)
                    }
                    print(f"  ✗ {endpoint}: ERROR - {str(e)}")
        
        success_count = sum(1 for r in results.values() if r["success"])
        print(f"\nEndpoint tests: {success_count}/{len(endpoints)} successful")
        
        return results
        
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return {}

async def test_error_handling():
    """Тестирует обработку ошибок"""
    print("\nTesting error handling...")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Тест 404 ошибки
            print("- Testing 404 error...")
            response = await client.get(f"{API_BASE}/api/nonexistent")
            print(f"  Status: {response.status_code}")
            if response.status_code == 404:
                print("  SUCCESS: 404 handled correctly")
            
            # Тест некорректного JSON
            print("- Testing invalid JSON...")
            response = await client.post(
                f"{API_BASE}/api/users/auth",
                data="invalid json"
            )
            print(f"  Status: {response.status_code}")
            if response.status_code in [400, 422]:
                print("  SUCCESS: Invalid JSON handled correctly")
            
            # Тест несуществующего пользователя
            print("- Testing non-existent user...")
            response = await client.get(f"{API_BASE}/api/users/999999/profile")
            print(f"  Status: {response.status_code}")
            if response.status_code == 404:
                print("  SUCCESS: Non-existent user handled correctly")
        
        return True
        
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return False

async def test_cors_headers():
    """Тестирует CORS заголовки"""
    print("\nTesting CORS headers...")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # OPTIONS запрос для проверки CORS
            response = await client.options(f"{API_BASE}/api/cases/")
            
            print(f"Status: {response.status_code}")
            
            headers = response.headers
            cors_headers = [
                "access-control-allow-origin",
                "access-control-allow-methods",
                "access-control-allow-headers"
            ]
            
            found_headers = 0
            for header in cors_headers:
                if header in headers:
                    found_headers += 1
                    print(f"  ✓ {header}: {headers[header]}")
                else:
                    print(f"  ✗ {header}: Not found")
            
            if found_headers >= 1:
                print("SUCCESS: CORS headers present")
                return True
            else:
                print("WARNING: CORS headers missing")
                return False
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return False

async def test_response_times():
    """Тестирует время отклика эндпоинтов"""
    print("\nTesting response times...")
    
    import time
    
    endpoints = [
        "/health",
        "/api/stats",
        "/api/cases/",
        "/api/cases/stats"
    ]
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            for endpoint in endpoints:
                start_time = time.time()
                response = await client.get(f"{API_BASE}{endpoint}")
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # в миллисекундах
                
                status_icon = "✓" if response.status_code == 200 else "✗"
                speed_icon = "🟢" if response_time < 500 else "🟡" if response_time < 1000 else "🔴"
                
                print(f"  {status_icon} {speed_icon} {endpoint}: {response_time:.0f}ms")
        
        return True
        
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return False

async def main():
    """Основная функция тестирования системных функций"""
    print("=" * 50)
    print("TESTING SYSTEM MODULE")
    print("=" * 50)
    
    # Базовые проверки
    health_ok = await test_health_check()
    root_ok = await test_root_endpoint()
    
    if not health_ok or not root_ok:
        print("\nCRITICAL: Basic system tests failed!")
        print("Check if the server is running on http://localhost:8000")
        return
    
    # Дополнительные тесты
    await test_public_stats()
    await test_api_endpoints()
    await test_error_handling()
    await test_cors_headers()
    await test_response_times()
    
    print("\nSystem tests completed")

if __name__ == "__main__":
    asyncio.run(main())