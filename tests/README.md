# Тестирование CrazyGift API

Набор скриптов для комплексного тестирования функционала backend API.

## Требования

- Python 3.8+
- Установленные зависимости: `httpx`
- Запущенный API сервер на `localhost:8000`

```bash
pip install httpx
```

## Структура тестов

### Отдельные модули

#### `test_system.py`
Тестирует системные функции:
- Проверка состояния (`/health`)
- Корневой эндпоинт (`/`)
- Публичная статистика (`/api/stats`)
- Доступность API эндпоинтов
- Обработка ошибок
- CORS заголовки
- Время отклика

#### `test_auth.py`
Тестирует авторизацию:
- Авторизация через Telegram WebApp
- Получение профиля пользователя
- Статистика пользователя
- Генерация Telegram auth данных

#### `test_cases.py`
Тестирует систему кейсов:
- Получение списка кейсов
- Детали конкретного кейса
- Открытие кейса
- Категории кейсов
- Статистика кейсов

#### `test_payments.py`
Тестирует платежную систему:
- Создание TON депозита
- Создание Stars инвойса
- Webhook обработка (TON и Telegram)
- Получение информации о транзакциях
- Валидация некорректных платежей

#### `test_inventory.py`
Тестирует инвентарь:
- Получение инвентаря пользователя
- Статистика инвентаря
- Продажа предметов
- Запрос на вывод предметов
- Фильтрация по редкости
- Список запросов на вывод

### Комплексное тестирование

#### `test_complete.py`
Запускает все тесты модулей последовательно и выполняет комплексный сценарий:
1. Авторизация пользователя
2. Проверка баланса
3. Получение списка кейсов
4. Открытие кейса
5. Проверка инвентаря
6. Продажа предмета
7. Финальная статистика

## Запуск тестов

### Вариант 1: Через скрипт (рекомендуется)

```bash
# Сделать скрипт исполняемым
chmod +x run_tests.sh

# Запустить все тесты
./run_tests.sh

# Запустить конкретный модуль
./run_tests.sh system
./run_tests.sh auth
./run_tests.sh cases
./run_tests.sh payments
./run_tests.sh inventory

# Показать помощь
./run_tests.sh help
```

### Вариант 2: Напрямую через Python

```bash
# Все тесты
python3 test_complete.py

# Отдельные модули
python3 test_system.py
python3 test_auth.py
python3 test_cases.py
python3 test_payments.py
python3 test_inventory.py
```

## Подготовка к запуску

### 1. Запуск API сервера

```bash
# Из корневой директории проекта
cd backend
python3 run.py
```

Сервер должен запуститься на `http://localhost:8000`

### 2. Настройка конфигурации

В файлах тестов при необходимости измените:

```python
# Базовый URL API
API_BASE = "http://localhost:8000/api"

# Токен бота (для test_auth.py)
BOT_TOKEN = "your_bot_token_here"
```

### 3. Создание тестовых данных

API автоматически создает тестовые кейсы при первом запуске в debug режиме.

## Интерпретация результатов

### Успешное выполнение
```
✓ system        SUCCESS  (0.45s)
✓ auth          SUCCESS  (1.23s)
✓ cases         SUCCESS  (0.78s)
✓ payments      SUCCESS  (2.15s)
✓ inventory     SUCCESS  (0.89s)

🎉 ALL TESTS PASSED! API is ready for production.
```

### Частичные ошибки
```
✓ system        SUCCESS  (0.45s)
✗ auth          FAILED   (1.23s)
✓ cases         SUCCESS  (0.78s)

⚠️  FAILED MODULES: auth
Check the logs above for detailed error information.
```

## Типичные проблемы и решения

### Сервер не запущен
```
ERROR: API server is not running on localhost:8000
Please start the server with: python3 backend/run.py
```
**Решение:** Запустите API сервер

### Ошибки авторизации
```
ERROR: Invalid hash signature
```
**Решение:** Проверьте правильность `BOT_TOKEN` в `test_auth.py`

### Timeout ошибки
```
EXCEPTION: Request timeout
```
**Решение:** Увеличьте timeout в тестах или проверьте производительность сервера

### Ошибки базы данных
```
ERROR: Database connection failed
```
**Решение:** Проверьте настройки базы данных в `.env` файле

## Добавление новых тестов

### Создание нового тестового модуля

```python
#!/usr/bin/env python3
"""
Тестирование нового функционала
"""

import httpx
import asyncio

API_BASE = "http://localhost:8000/api"

async def test_new_feature():
    """Тестирует новую функцию"""
    print("Testing new feature...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/new-endpoint")
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("SUCCESS: New feature working")
                return data
            else:
                print(f"ERROR: {response.text}")
                return None
                
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return None

async def main():
    """Основная функция тестирования"""
    print("=" * 50)
    print("TESTING NEW MODULE")
    print("=" * 50)
    
    await test_new_feature()
    
    print("\nNew module tests completed")

if __name__ == "__main__":
    asyncio.run(main())
```

### Интеграция в комплексные тесты

Добавьте новый модуль в `test_complete.py`:

```python
# Импорт
import test_new_module

# В список тестов
test_modules = [
    ("system", test_system.main),
    ("auth", None),
    ("cases", test_cases.main),
    ("payments", test_payments.main),
    ("inventory", test_inventory.main),
    ("new_module", test_new_module.main),  # Новый модуль
]
```

## Автоматизация

### GitHub Actions

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.8'
    
    - name: Install dependencies
      run: |
        pip install -r backend/requirements.txt
        pip install httpx
    
    - name: Start API server
      run: |
        cd backend
        python3 run.py &
        sleep 10
    
    - name: Run tests
      run: |
        cd tests
        python3 test_complete.py
```

### Локальная автоматизация

```bash
#!/bin/bash
# auto_test.sh - Автоматический запуск тестов при изменении кода

while inotifywait -e modify -r ../backend/; do
    echo "Code changed, running tests..."
    ./run_tests.sh
    echo "Tests completed at $(date)"
done
```

## Метрики и отчеты

### Генерация отчета в JSON

Добавьте в `test_complete.py`:

```python
import json

def save_test_report(results, filename="test_report.json"):
    """Сохраняет результаты тестов в JSON"""
    report = {
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "total_tests": len(results),
        "passed": sum(1 for r in results.values() if r['result'] == 'SUCCESS'),
        "failed": sum(1 for r in results.values() if r['result'] == 'FAILED'),
        "total_duration": sum(r['duration'] for r in results.values()),
        "results": results
    }
    
    with open(filename, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"Test report saved to {filename}")
```

### Мониторинг производительности

```python
def check_performance_regression(current_times, baseline_file="baseline_times.json"):
    """Проверяет регрессию производительности"""
    try:
        with open(baseline_file, 'r') as f:
            baseline = json.load(f)
        
        for endpoint, current_time in current_times.items():
            baseline_time = baseline.get(endpoint, 0)
            if current_time > baseline_time * 1.5:  # 50% регрессия
                print(f"PERFORMANCE REGRESSION: {endpoint} took {current_time:.2f}s (baseline: {baseline_time:.2f}s)")
    
    except FileNotFoundError:
        print("No baseline file found, creating new baseline")
        with open(baseline_file, 'w') as f:
            json.dump(current_times, f, indent=2)
```

## Заключение

Эти тесты обеспечивают:

- **Полное покрытие** всех основных функций API
- **Автоматическую проверку** корректности работы
- **Раннее обнаружение** проблем при разработке
- **Документирование** ожидаемого поведения API
- **Готовность к production** деплою

Регулярно запускайте тесты при изменении кода для обеспечения стабильности системы.