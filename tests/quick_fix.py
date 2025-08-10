#!/usr/bin/env python3
"""
Финальное исправление всех оставшихся проблем
"""

import os
import sys

def create_working_test_user():
    """Создает рабочий скрипт для создания тестового пользователя"""
    script_content = '''#!/usr/bin/env python3
import asyncio
import sys
import os
from pathlib import Path

# Добавляем путь к backend
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

async def create_test_user():
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
                print(f"Test user already exists: ID {existing_user.id}")
                print(f"Balance: {existing_user.balance_stars} stars")
                return existing_user.id
            
            # Создаем нового пользователя
            test_user = User(
                telegram_id=123456789,
                username="testuser", 
                first_name="Test",
                last_name="User",
                referral_code=generate_referral_code(123456789),
                balance_stars=10000
            )
            
            db.add(test_user)
            await db.commit()
            await db.refresh(test_user)
            
            print(f"SUCCESS: Created test user ID {test_user.id}")
            print(f"Telegram ID: {test_user.telegram_id}")
            print(f"Balance: {test_user.balance_stars} stars")
            print(f"Referral code: {test_user.referral_code}")
            
            return test_user.id
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return None

if __name__ == "__main__":
    print("Creating test user for API testing...")
    user_id = asyncio.run(create_test_user())
    if user_id:
        print(f"\\nTest user ready! Use ID {user_id} in tests.")
    else:
        print("\\nFailed to create test user.")
'''
    
    with open("create_test_user.py", 'w') as f:
        f.write(script_content)
    
    os.chmod("create_test_user.py", 0o755)
    print("✓ Created working test user script")

def fix_cases_api_completely():
    """Полностью исправляет API кейсов"""
    cases_file_path = Path(__file__).parent.parent / "backend" / "app" / "api" / "cases.py"
    
    if not cases_file_path.exists():
        print(f"Cases file not found: {cases_file_path}")
        return
    
    # Полная замена проблемного файла
    fixed_content = '''import json
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from ..database import get_db
from ..models import User, Case, InventoryItem, Transaction
from ..schemas import (
    CaseResponse, CaseDetailResponse, CaseOpenRequest, CaseOpenResponse,
    InventoryItemResponse, CaseItem
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[CaseResponse])
async def get_cases(
    category: Optional[str] = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Получить список всех кейсов"""
    try:
        query = select(Case)
        
        if active_only:
            query = query.where(Case.active == True)
        
        if category:
            query = query.where(Case.category == category)
        
        query = query.order_by(Case.price_stars.asc())
        
        result = await db.execute(query)
        cases = result.scalars().all()
        
        return [CaseResponse.model_validate(case) for case in cases]
        
    except Exception as e:
        logger.error(f"Error getting cases: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cases"
        )


@router.get("/categories")
async def get_case_categories(db: AsyncSession = Depends(get_db)):
    """Получить список категорий кейсов"""
    try:
        result = await db.execute(
            select(Case.category, func.count(Case.id).label('count'))
            .where(Case.active == True)
            .group_by(Case.category)
            .order_by(Case.category)
        )
        
        categories = result.all()
        
        return [
            {
                "name": category.category or "default",
                "count": category.count,
                "display_name": get_category_display_name(category.category)
            }
            for category in categories
        ]
        
    except Exception as e:
        logger.error(f"Error getting case categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get categories"
        )


@router.get("/stats")
async def get_cases_stats(db: AsyncSession = Depends(get_db)):
    """Получить общую статистику по кейсам"""
    try:
        total_cases = await db.scalar(
            select(func.count(Case.id)).where(Case.active == True)
        )
        
        total_opened = await db.scalar(
            select(func.sum(Case.total_opened)).where(Case.active == True)
        ) or 0
        
        popular_case_result = await db.execute(
            select(Case.name, Case.total_opened)
            .where(Case.active == True)
            .order_by(Case.total_opened.desc())
            .limit(1)
        )
        popular_case = popular_case_result.first()
        
        price_range_result = await db.execute(
            select(
                func.min(Case.price_stars).label('min_price'),
                func.max(Case.price_stars).label('max_price'),
                func.avg(Case.price_stars).label('avg_price')
            ).where(Case.active == True)
        )
        price_range = price_range_result.first()
        
        return {
            "total_cases": total_cases or 0,
            "total_opened": total_opened,
            "popular_case": {
                "name": popular_case.name if popular_case else None,
                "times_opened": popular_case.total_opened if popular_case else 0
            },
            "price_range": {
                "min": price_range.min_price if price_range else 0,
                "max": price_range.max_price if price_range else 0,
                "average": round(float(price_range.avg_price), 2) if price_range and price_range.avg_price else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting cases stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get stats"
        )


@router.get("/{case_id}", response_model=CaseDetailResponse)
async def get_case(case_id: int, db: AsyncSession = Depends(get_db)):
    """Получить детали конкретного кейса"""
    result = await db.execute(
        select(Case).where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    if not case.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case is not active"
        )
    
    try:
        items_data = json.loads(case.items)
        items = [CaseItem(**item) for item in items_data]
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"Error parsing case items for case {case_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid case data"
        )
    
    # Создаем ответ правильно
    case_dict = {
        "id": case.id,
        "name": case.name,
        "description": case.description,
        "price_stars": case.price_stars,
        "image_url": case.image_url,
        "category": case.category,
        "active": case.active,
        "total_opened": case.total_opened,
        "created_at": case.created_at,
        "items": items
    }
    
    return CaseDetailResponse(**case_dict)


@router.post("/{case_id}/open", response_model=CaseOpenResponse)
async def open_case(
    case_id: int,
    request: CaseOpenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Открыть кейс"""
    try:
        case_result = await db.execute(
            select(Case).where(Case.id == case_id, Case.active == True)
        )
        case = case_result.scalar_one_or_none()
        
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found or inactive"
            )
        
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.balance_stars < case.price_stars:
            return CaseOpenResponse(
                success=False,
                new_balance=user.balance_stars,
                message=f"Недостаточно звёзд. Нужно: {case.price_stars}, у вас: {user.balance_stars}"
            )
        
        try:
            items_data = json.loads(case.items)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid case data"
            )
        
        chosen_item_data = select_random_item(items_data)
        
        if not chosen_item_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to select item from case"
            )
        
        new_balance = user.balance_stars - case.price_stars
        
        await db.execute(
            update(User)
            .where(User.id == request.user_id)
            .values(
                balance_stars=new_balance,
                total_cases_opened=User.total_cases_opened + 1,
                total_spent_stars=User.total_spent_stars + case.price_stars
            )
        )
        
        purchase_transaction = Transaction(
            user_id=request.user_id,
            type="case_purchase",
            amount=case.price_stars,
            currency="STARS",
            status="completed",
            description=f"Opened case: {case.name}",
            completed_at=func.now()
        )
        db.add(purchase_transaction)
        
        inventory_item = InventoryItem(
            user_id=request.user_id,
            item_name=chosen_item_data['name'],
            item_value=chosen_item_data['value'],
            item_stars=chosen_item_data['stars'],
            rarity=chosen_item_data['rarity'],
            image_url=chosen_item_data['image'],
            case_name=case.name,
            case_id=case.id
        )
        db.add(inventory_item)
        
        await db.execute(
            update(Case)
            .where(Case.id == case_id)
            .values(total_opened=Case.total_opened + 1)
        )
        
        await db.commit()
        await db.refresh(inventory_item)
        
        logger.info(
            f"User {request.user_id} opened case {case_id} and got {chosen_item_data['name']}"
        )
        
        return CaseOpenResponse(
            success=True,
            item=InventoryItemResponse.model_validate(inventory_item),
            new_balance=new_balance,
            message=f"Поздравляем! Вы получили: {chosen_item_data['name']}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error opening case {case_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to open case"
        )


def select_random_item(items_data: List[dict]) -> Optional[dict]:
    """Выбирает случайный предмет на основе весов"""
    try:
        if not items_data:
            return None
        
        weights = []
        for item in items_data:
            weight = item.get('weight', 1)
            if weight <= 0:
                weight = 1
            weights.append(weight)
        
        chosen_item = random.choices(items_data, weights=weights)[0]
        
        return chosen_item
        
    except Exception as e:
        logger.error(f"Error selecting random item: {str(e)}")
        return None


def get_category_display_name(category: str) -> str:
    """Возвращает отображаемое имя категории"""
    category_names = {
        "basic": "Базовые",
        "premium": "Премиум",
        "vip": "VIP",
        "special": "Специальные",
        "limited": "Лимитированные"
    }
    
    return category_names.get(category, category or "Разное")
'''
    
    with open(cases_file_path, 'w') as f:
        f.write(fixed_content)
    
    print("✓ Completely fixed cases API")

def create_simple_test_runner():
    """Создает простой скрипт для последовательного выполнения"""
    script_content = '''#!/usr/bin/env python3
"""
Простой запуск тестов с созданием пользователя
"""

import asyncio
import subprocess
import sys

async def run_tests():
    print("=== CrazyGift API Test Runner ===")
    
    # Шаг 1: Создаем тестового пользователя
    print("\\nStep 1: Creating test user...")
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
    print("\\nStep 2: Running tests...")
    try:
        result = subprocess.run([sys.executable, "test_complete.py"], 
                              capture_output=False, text=True)
    except Exception as e:
        print(f"Error running tests: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())
'''
    
    with open("run_full_test.py", 'w') as f:
        f.write(script_content)
    
    os.chmod("run_full_test.py", 0o755)
    print("✓ Created simple test runner")

def main():
    """Применяет финальные исправления"""
    print("Applying final fixes...")
    print("=" * 40)
    
    # Import Path
    from pathlib import Path
    globals()['Path'] = Path
    
    create_working_test_user()
    fix_cases_api_completely()
    create_simple_test_runner()
    
    print("\n" + "=" * 40)
    print("Final fixes applied!")
    print("\nNext steps:")
    print("1. Restart backend: cd ../backend && python3 run.py")
    print("2. Run tests: python3 run_full_test.py")
    print("\nOR manually:")
    print("1. python3 create_test_user.py")
    print("2. python3 test_complete.py")

if __name__ == "__main__":
    main()