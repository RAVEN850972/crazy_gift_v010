#!/usr/bin/env python3
"""
Тестирование платежной системы
"""

import httpx
import asyncio
import time

# Конфигурация
API_BASE = "http://localhost:8000/api"

async def test_create_ton_deposit(user_id, amount):
    """Тестирует создание TON депозита"""
    print(f"Testing TON deposit creation - User {user_id}, Amount {amount} TON...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/payments/ton/deposit",
                json={
                    "user_id": user_id,
                    "amount": amount
                }
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: TON deposit created")
                print(f"Transaction ID: {data['transaction_id']}")
                print(f"TON amount: {data['ton_transaction']['messages'][0]['amount']} nanotons")
                print(f"Recipient: {data['ton_transaction']['messages'][0]['address']}")
                print(f"Valid until: {data['ton_transaction']['valid_until']}")
                
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_create_stars_invoice(user_id, stars_amount):
    """Тестирует создание Stars инвойса"""
    print(f"Testing Stars invoice creation - User {user_id}, Amount {stars_amount} stars...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/payments/stars/invoice",
                json={
                    "user_id": user_id,
                    "stars_amount": stars_amount
                }
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Stars invoice created")
                print(f"Transaction ID: {data['transaction_id']}")
                print(f"Invoice link: {data['invoice_link'][:50]}...")
                
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_ton_webhook(transaction_id):
    """Тестирует TON webhook"""
    print(f"Testing TON webhook - Transaction {transaction_id}...")
    
    # Генерируем фейковый hash для тестирования
    fake_tx_hash = f"test_hash_{int(time.time())}"
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/payments/webhook/ton",
                json={
                    "transaction_id": transaction_id,
                    "tx_hash": fake_tx_hash
                }
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: TON webhook processed")
                print(f"Message: {data['message']}")
                
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_telegram_webhook(transaction_id):
    """Тестирует Telegram webhook"""
    print(f"Testing Telegram webhook - Transaction {transaction_id}...")
    
    # Генерируем фейковый payment ID
    fake_payment_id = f"tg_payment_{int(time.time())}"
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/payments/webhook/telegram",
                json={
                    "transaction_id": transaction_id,
                    "payment_id": fake_payment_id,
                    "status": "paid"
                }
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Telegram webhook processed")
                print(f"Message: {data['message']}")
                
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_get_transaction(transaction_id):
    """Тестирует получение информации о транзакции"""
    print(f"Testing transaction info - ID {transaction_id}...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/payments/transaction/{transaction_id}")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: Transaction info retrieved")
                print(f"Type: {data['type']}")
                print(f"Amount: {data['amount']} {data['currency']}")
                print(f"Status: {data['status']}")
                print(f"Created: {data['created_at']}")
                
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def test_invalid_payments():
    """Тестирует некорректные платежи"""
    print("\nTesting invalid payment scenarios...")
    
    test_user_id = 999999  # Несуществующий пользователь
    
    # Тест с несуществующим пользователем
    print("- Testing with non-existent user...")
    result = await test_create_ton_deposit(test_user_id, 1.0)
    if result is None:
        print("  EXPECTED: Failed as expected")
    
    # Тест с некорректной суммой
    print("- Testing with invalid amount...")
    result = await test_create_ton_deposit(1, -5.0)
    if result is None:
        print("  EXPECTED: Failed as expected")
    
    # Тест с слишком большой суммой
    print("- Testing with excessive amount...")
    result = await test_create_ton_deposit(1, 10000.0)
    if result is None:
        print("  EXPECTED: Failed as expected")

async def main():
    """Основная функция тестирования платежей"""
    print("=" * 50)
    print("TESTING PAYMENTS MODULE")
    print("=" * 50)
    
    test_user_id = 1  # Предполагаем что пользователь существует
    
    # Тестируем TON депозит
    ton_deposit = await test_create_ton_deposit(test_user_id, 1.5)
    
    if ton_deposit:
        transaction_id = ton_deposit['transaction_id']
        
        # Тестируем получение информации о транзакции
        await test_get_transaction(transaction_id)
        
        # Тестируем webhook
        await test_ton_webhook(transaction_id)
        
        # Ждем немного и проверяем статус снова
        await asyncio.sleep(1)
        await test_get_transaction(transaction_id)
    
    print("\n" + "-" * 30)
    
    # Тестируем Stars инвойс
    stars_invoice = await test_create_stars_invoice(test_user_id, 1000)
    
    if stars_invoice:
        transaction_id = stars_invoice['transaction_id']
        
        # Тестируем получение информации о транзакции
        await test_get_transaction(transaction_id)
        
        # Тестируем webhook
        await test_telegram_webhook(transaction_id)
        
        # Проверяем статус снова
        await asyncio.sleep(1)
        await test_get_transaction(transaction_id)
    
    # Тестируем некорректные сценарии
    await test_invalid_payments()
    
    print("\nPayments tests completed")

if __name__ == "__main__":
    asyncio.run(main())