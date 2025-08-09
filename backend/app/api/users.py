from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import User, InventoryItem, Transaction
from ..schemas import (
    TelegramAuthRequest, TelegramAuthResponse, UserResponse, 
    UserProfileResponse, UserUpdate, HistoryFilter, HistoryResponse,
    TransactionResponse
)
from ..auth import verify_telegram_auth, validate_user_data, generate_referral_code, extract_referral_code
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/auth", response_model=TelegramAuthResponse)
async def telegram_auth(
    auth_request: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Авторизация пользователя через Telegram WebApp
    """
    try:
        # Проверяем подлинность данных от Telegram
        raw_user_data = verify_telegram_auth(auth_request.init_data)
        
        # Валидируем и очищаем данные
        user_data = validate_user_data(raw_user_data)
        
        # Ищем существующего пользователя
        result = await db.execute(
            select(User).where(User.telegram_id == user_data['telegram_id'])
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Обновляем время последней активности
            await db.execute(
                update(User)
                .where(User.id == user.id)
                .values(
                    last_active=datetime.utcnow(),
                    username=user_data['username'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name']
                )
            )
            await db.commit()
            await db.refresh(user)
            
            logger.info(f"User {user.telegram_id} logged in")
        else:
            # Создаем нового пользователя
            referral_code = generate_referral_code(user_data['telegram_id'])
            
            # Проверяем реферальный код
            referring_user_id = None
            ref_code = extract_referral_code(user_data)
            if ref_code:
                ref_result = await db.execute(
                    select(User).where(User.referral_code == ref_code)
                )
                referring_user = ref_result.scalar_one_or_none()
                if referring_user:
                    referring_user_id = referring_user.id
            
            user = User(
                telegram_id=user_data['telegram_id'],
                username=user_data['username'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                referral_code=referral_code,
                referred_by=referring_user_id,
                balance_stars=100,  # Приветственный бонус
                last_active=datetime.utcnow()
            )
            
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            # Начисляем бонус рефереру
            if referring_user_id:
                await db.execute(
                    update(User)
                    .where(User.id == referring_user_id)
                    .values(balance_stars=User.balance_stars + 50)
                )
                await db.commit()
            
            logger.info(f"New user {user.telegram_id} registered with referral: {ref_code}")
        
        return TelegramAuthResponse(
            success=True,
            user=UserResponse.model_validate(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить полный профиль пользователя"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserProfileResponse.model_validate(user)


@router.put("/{user_id}/profile", response_model=UserResponse)
async def update_user_profile(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновить профиль пользователя"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Обновляем только переданные поля
    update_data = user_update.model_dump(exclude_unset=True)
    if update_data:
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(**update_data, updated_at=datetime.utcnow())
        )
        await db.commit()
        await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.get("/{user_id}/balance")
async def get_user_balance(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить баланс пользователя"""
    result = await db.execute(
        select(User.balance_stars, User.balance_ton).where(User.id == user_id)
    )
    balance = result.first()
    
    if not balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "balance_stars": balance.balance_stars,
        "balance_ton": float(balance.balance_ton),
        "user_id": user_id
    }


@router.get("/{user_id}/stats")
async def get_user_stats(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить статистику пользователя"""
    # Основная информация о пользователе
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Статистика по предметам
    inventory_stats = await db.execute(
        select(
            func.count(InventoryItem.id).label('total_items'),
            func.count(InventoryItem.id).filter(InventoryItem.rarity == 'common').label('common_items'),
            func.count(InventoryItem.id).filter(InventoryItem.rarity == 'rare').label('rare_items'),
            func.count(InventoryItem.id).filter(InventoryItem.rarity == 'epic').label('epic_items'),
            func.count(InventoryItem.id).filter(InventoryItem.rarity == 'legendary').label('legendary_items'),
            func.count(InventoryItem.id).filter(InventoryItem.rarity == 'mythic').label('mythic_items'),
        ).where(
            InventoryItem.user_id == user_id,
            InventoryItem.is_withdrawn == False
        )
    )
    inventory = inventory_stats.first()
    
    # Статистика по транзакциям
    transaction_stats = await db.execute(
        select(
            func.count(Transaction.id).filter(Transaction.type == 'case_purchase').label('total_purchases'),
            func.sum(Transaction.amount).filter(Transaction.type == 'case_purchase').label('total_spent'),
            func.sum(Transaction.amount).filter(Transaction.type == 'item_sale').label('total_earned'),
        ).where(
            Transaction.user_id == user_id,
            Transaction.status == 'completed'
        )
    )
    transactions = transaction_stats.first()
    
    # Количество рефералов
    referrals_count = await db.scalar(
        select(func.count(User.id)).where(User.referred_by == user_id)
    )
    
    return {
        "user_id": user_id,
        "total_cases_opened": user.total_cases_opened,
        "total_spent_stars": user.total_spent_stars,
        "total_earned_stars": user.total_earned_stars,
        "inventory": {
            "total_items": inventory.total_items or 0,
            "common_items": inventory.common_items or 0,
            "rare_items": inventory.rare_items or 0,
            "epic_items": inventory.epic_items or 0,
            "legendary_items": inventory.legendary_items or 0,
            "mythic_items": inventory.mythic_items or 0,
        },
        "transactions": {
            "total_purchases": transactions.total_purchases or 0,
            "total_spent": float(transactions.total_spent or 0),
            "total_earned": float(transactions.total_earned or 0),
        },
        "referrals_count": referrals_count or 0,
        "member_since": user.created_at.isoformat(),
        "last_active": user.last_active.isoformat() if user.last_active else None
    }


@router.get("/{user_id}/history", response_model=HistoryResponse)
async def get_user_history(
    user_id: int,
    transaction_type: Optional[str] = None,
    currency: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Получить историю операций пользователя"""
    # Проверяем существование пользователя
    user_exists = await db.scalar(
        select(User.id).where(User.id == user_id)
    )
    
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Строим запрос с фильтрами
    query = select(Transaction).where(Transaction.user_id == user_id)
    
    if transaction_type:
        query = query.where(Transaction.type == transaction_type)
    
    if currency:
        query = query.where(Transaction.currency == currency)
    
    if status:
        query = query.where(Transaction.status == status)
    
    # Получаем общее количество
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Добавляем пагинацию и сортировку
    query = query.order_by(Transaction.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return HistoryResponse(
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
        total=total or 0,
        has_more=(offset + limit) < (total or 0)
    )


@router.get("/{user_id}/referrals")
async def get_user_referrals(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить информацию о рефералах пользователя"""
    # Проверяем существование пользователя
    user_result = await db.execute(
        select(User.referral_code).where(User.id == user_id)
    )
    user = user_result.first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Получаем список рефералов
    referrals_result = await db.execute(
        select(
            User.id,
            User.first_name,
            User.username,
            User.created_at,
            User.total_cases_opened,
            User.last_active
        ).where(User.referred_by == user_id)
        .order_by(User.created_at.desc())
    )
    referrals = referrals_result.all()
    
    # Статистика по рефералам
    total_referrals = len(referrals)
    active_referrals = sum(1 for ref in referrals if ref.total_cases_opened > 0)
    
    # Реферальная ссылка
    referral_link = f"https://t.me/your_bot?start=ref_{user.referral_code}"
    
    return {
        "referral_code": user.referral_code,
        "referral_link": referral_link,
        "total_referrals": total_referrals,
        "active_referrals": active_referrals,
        "referrals": [
            {
                "id": ref.id,
                "name": ref.first_name or ref.username or f"User {ref.id}",
                "username": ref.username,
                "joined_at": ref.created_at.isoformat(),
                "cases_opened": ref.total_cases_opened,
                "last_active": ref.last_active.isoformat() if ref.last_active else None,
                "is_active": ref.total_cases_opened > 0
            }
            for ref in referrals
        ]
    }