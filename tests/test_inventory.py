#!/usr/bin/env python3
"""
Тестирование системы инвентаря
"""

import httpx
import asyncio

# Конфигурация
API_BASE = "http://localhost:8000/api"

async def test_get_inventory(user_id, rarity=None):
    """Тестирует получение инвентаря пользователя"""
    print(f"Testing inventory for user {user_id}" + (f" (rarity: {rarity})" if rarity else ""))
    
    try:
        params = {}
        if rarity:
            params['rarity'] = rarity
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{API_BASE}/inventory/{user_id}",
                params=params
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                items = response.json()
                print(f"SUCCESS: Retrieved {len(items)} items")
                
                for item in items[:5]:  # Показываем первые 5 предметов
                    print(f"- {item['item_name']} ({item['rarity']})")
                    print(f"  Value: {item['item_stars']} stars")
                    print(f"  From: {item.get('case_name', 'Unknown case')}")
                
                if len(items) > 5:
                    print(f"  ... and {len(items) - 5} more items")
                
                return items
            else:
                print(f"ERROR: {response.text}")
                return []
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return []

async def test_inventory_stats(user_id):
    """Тестирует получение статистики инвентаря"""
    print(f"\nTesting inventory stats for user {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/inventory/{user_id}/stats")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                stats = response.json()
                print("SUCCESS: Inventory stats retrieved")
                print(f"Total items: {stats['total_items']}")
                print(f"Portfolio value: {stats['portfolio_value']:.2f} TON")
                print(f"Portfolio stars: {stats['portfolio_stars']:,}")
                print(f"Withdrawn items: {stats['withdrawn_items']}")
                
                print("\nBy rarity:")
                for rarity, data in stats['by_rarity'].items():
                    print(f"  {rarity}: {data['count']} items ({data['total_stars']:,} stars)")
                
                most_valuable = stats['most_valuable_item']
                if most_valuable['name']:
                    print(f"\nMost valuable: {most_valuable['name']} ({most_valuable['rarity']}) - {most_valuable['value']:.2f} TON")
                
                return stats
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_sell_item(item_id, user_id):
    """Тестирует продажу предмета"""
    print(f"\nTesting item sale - Item {item_id}, User {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/inventory/{item_id}/sell",
                json={"user_id": user_id}
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if result['success']:
                    print("SUCCESS: Item sold")
                    print(f"Stars earned: {result['stars_earned']:,}")
                    print(f"New balance: {result['new_balance']:,} stars")
                    print(f"Message: {result['message']}")
                else:
                    print(f"FAILED: Sale failed")
                
                return result
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_withdraw_item(item_id, user_id, contact_info="telegram: @testuser"):
    """Тестирует запрос на вывод предмета"""
    print(f"\nTesting item withdrawal - Item {item_id}, User {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/inventory/{item_id}/withdraw",
                json={
                    "user_id": user_id,
                    "contact_info": contact_info
                }
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if result['success']:
                    print("SUCCESS: Withdrawal requested")
                    print(f"Message: {result['message']}")
                else:
                    print(f"FAILED: Withdrawal failed")
                
                return result
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_get_withdrawals(user_id):
    """Тестирует получение списка запросов на вывод"""
    print(f"\nTesting withdrawal requests for user {user_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/inventory/{user_id}/withdrawals")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Withdrawal requests retrieved")
                
                withdrawn_items = data['withdrawn_items']
                transactions = data['transactions']
                
                print(f"Withdrawn items: {len(withdrawn_items)}")
                for item in withdrawn_items:
                    print(f"- {item['name']} ({item['rarity']}) - {item['stars']:,} stars")
                    print(f"  Requested: {item['requested_at']}")
                
                print(f"Related transactions: {len(transactions)}")
                for tx in transactions:
                    print(f"- {tx['description']} - {tx['status']}")
                
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_inventory_filters(user_id):
    """Тестирует фильтрацию инвентаря"""
    print(f"\nTesting inventory filters for user {user_id}...")
    
    rarities = ['common', 'rare', 'epic', 'legendary', 'mythic']
    
    for rarity in rarities:
        items = await test_get_inventory(user_id, rarity)
        print(f"  {rarity}: {len(items)} items")

async def test_invalid_operations(user_id):
    """Тестирует некорректные операции с инвентарем"""
    print(f"\nTesting invalid inventory operations...")
    
    # Тест с несуществующим предметом
    print("- Testing with non-existent item...")
    result = await test_sell_item(999999, user_id)
    if result is None:
        print("  EXPECTED: Failed as expected")
    
    # Тест с несуществующим пользователем
    print("- Testing with non-existent user...")
    result = await test_sell_item(1, 999999)
    if result is None:
        print("  EXPECTED: Failed as expected")

async def main():
    """Основная функция тестирования инвентаря"""
    print("=" * 50)
    print("TESTING INVENTORY MODULE")
    print("=" * 50)
    
    test_user_id = 1  # Предполагаем что пользователь существует
    
    # Получаем инвентарь
    items = await test_get_inventory(test_user_id)
    
    # Получаем статистику инвентаря
    await test_inventory_stats(test_user_id)
    
    # Тестируем фильтры
    await test_inventory_filters(test_user_id)
    
    if items:
        # Берем первый предмет для тестирования операций
        first_item = items[0]
        item_id = first_item['id']
        
        print(f"\nUsing item {item_id} ({first_item['item_name']}) for operations testing...")
        
        # Тестируем продажу (только если предмет недорогой)
        if first_item['item_stars'] < 1000:
            await test_sell_item(item_id, test_user_id)
        else:
            print("Skipping sale test - item too valuable")
            
            # Тестируем запрос на вывод для дорогого предмета
            await test_withdraw_item(item_id, test_user_id)
    
    # Получаем список запросов на вывод
    await test_get_withdrawals(test_user_id)
    
    # Тестируем некорректные операции
    await test_invalid_operations(test_user_id)
    
    print("\nInventory tests completed")

if __name__ == "__main__":
    asyncio.run(main())