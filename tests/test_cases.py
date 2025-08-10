#!/usr/bin/env python3
"""
Тестирование системы кейсов
"""

import httpx
import asyncio

# Конфигурация
API_BASE = "http://localhost:8000/api"

async def test_get_cases():
    """Тестирует получение списка кейсов"""
    print("Testing cases list...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/cases/")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                cases = response.json()
                print(f"SUCCESS: Retrieved {len(cases)} cases")
                
                for case in cases:
                    print(f"- {case['name']}: {case['price_stars']} stars")
                    print(f"  Category: {case.get('category', 'None')}")
                    print(f"  Times opened: {case['total_opened']}")
                
                return cases
            else:
                print(f"ERROR: {response.text}")
                return []
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return []

async def test_get_case_details(case_id):
    """Тестирует получение деталей кейса"""
    print(f"\nTesting case details for ID {case_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/cases/{case_id}")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                case = response.json()
                print("SUCCESS: Case details retrieved")
                print(f"Name: {case['name']}")
                print(f"Price: {case['price_stars']} stars")
                print(f"Items in case: {len(case['items'])}")
                
                # Показываем первые 3 предмета
                for i, item in enumerate(case['items'][:3]):
                    print(f"  {i+1}. {item['name']} ({item['rarity']}) - {item['stars']} stars")
                
                if len(case['items']) > 3:
                    print(f"  ... and {len(case['items']) - 3} more items")
                
                return case
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_open_case(case_id, user_id):
    """Тестирует открытие кейса"""
    print(f"\nTesting case opening - Case {case_id}, User {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/cases/{case_id}/open",
                json={"user_id": user_id}
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if result['success']:
                    print("SUCCESS: Case opened")
                    item = result['item']
                    print(f"Won item: {item['item_name']}")
                    print(f"Rarity: {item['rarity']}")
                    print(f"Value: {item['item_stars']} stars")
                    print(f"New balance: {result['new_balance']} stars")
                else:
                    print(f"FAILED: {result['message']}")
                
                return result
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_case_categories():
    """Тестирует получение категорий кейсов"""
    print("\nTesting case categories...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/cases/categories")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                categories = response.json()
                print(f"SUCCESS: Retrieved {len(categories)} categories")
                
                for category in categories:
                    print(f"- {category['display_name']}: {category['count']} cases")
                
                return categories
            else:
                print(f"ERROR: {response.text}")
                return []
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return []

async def test_case_stats():
    """Тестирует получение статистики кейсов"""
    print("\nTesting case statistics...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/cases/stats")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                stats = response.json()
                print("SUCCESS: Stats retrieved")
                print(f"Total cases: {stats['total_cases']}")
                print(f"Total opened: {stats['total_opened']}")
                print(f"Popular case: {stats['popular_case']['name']} ({stats['popular_case']['times_opened']} opens)")
                print(f"Price range: {stats['price_range']['min']} - {stats['price_range']['max']} stars")
                
                return stats
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def main():
    """Основная функция тестирования кейсов"""
    print("=" * 50)
    print("TESTING CASES MODULE")
    print("=" * 50)
    
    # Получаем список кейсов
    cases = await test_get_cases()
    
    if cases:
        # Тестируем детали первого кейса
        first_case = cases[0]
        case_details = await test_get_case_details(first_case['id'])
        
        # Тестируем открытие кейса (с тестовым пользователем)
        test_user_id = 1  # Предполагаем что пользователь с ID 1 существует
        await test_open_case(first_case['id'], test_user_id)
    
    # Тестируем категории
    await test_case_categories()
    
    # Тестируем статистику
    await test_case_stats()
    
    print("\nCases tests completed")

if __name__ == "__main__":
    asyncio.run(main())