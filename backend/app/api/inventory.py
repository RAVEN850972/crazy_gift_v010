from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func

from ..database import get_db
from ..models import User, InventoryItem, Transaction
from ..schemas import (
    InventoryItemResponse, SellItemRequest, SellItemResponse,
    WithdrawItemRequest, WithdrawItemResponse, SuccessResponse
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{user_id}", response_model=List[InventoryItemResponse])
async def get_user_inventory(
    user_id: int,
    rarity: Optional[str] = None,
    include_withdrawn: bool = False,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Получить инвентарь пользователя
    """
    try:
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
        query = select(InventoryItem).where(InventoryItem.user_id == user_id)
        
        if not include_withdrawn:
            query = query.where(InventoryItem.is_withdrawn == False)
        
        if rarity:
            query = query.where(InventoryItem.rarity == rarity)
        
        # Добавляем сортировку и пагинацию
        query = query.order_by(InventoryItem.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        items = result.scalars().all()
        
        return [InventoryItemResponse.model_validate(item) for item in items]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting inventory for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get inventory"
        )


@router.get("/{user_id}/stats")
async def get_inventory_stats(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Получить статистику инвентаря пользователя
    """
    try:
        # Проверяем существование пользователя
        user_exists = await db.scalar(
            select(User.id).where(User.id == user_id)
        )
        
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Статистика по редкости
        rarity_stats = await db.execute(
            select(
                InventoryItem.rarity,
                func.count(InventoryItem.id).label('count'),
                func.sum(InventoryItem.item_value).label('total_value'),
                func.sum(InventoryItem.item_stars).label('total_stars')
            )
            .where(
                InventoryItem.user_id == user_id,
                InventoryItem.is_withdrawn == False
            )
            .group_by(InventoryItem.rarity)
        )
        
        rarity_data = {}
        for row in rarity_stats:
            rarity_data[row.rarity] = {
                "count": row.count,
                "total_value": float(row.total_value or 0),
                "total_stars": row.total_stars or 0
            }
        
        # Общая статистика
        total_stats = await db.execute(
            select(
                func.count(InventoryItem.id).label('total_items'),
                func.sum(InventoryItem.item_value).label('portfolio_value'),
                func.sum(InventoryItem.item_stars).label('portfolio_stars'),
                func.count(InventoryItem.id).filter(InventoryItem.is_withdrawn == True).label('withdrawn_items')
            )
            .where(InventoryItem.user_id == user_id)
        )
        
        totals = total_stats.first()
        
        # Самый дорогой предмет
        most_valuable_result = await db.execute(
            select(InventoryItem)
            .where(
                InventoryItem.user_id == user_id,
                InventoryItem.is_withdrawn == False
            )
            .order_by(InventoryItem.item_value.desc())
            .limit(1)
        )
        most_valuable = most_valuable_result.scalar_one_or_none()
        
        return {
            "total_items": totals.total_items or 0,
            "portfolio_value": float(totals.portfolio_value or 0),
            "portfolio_stars": totals.portfolio_stars or 0,
            "withdrawn_items": totals.withdrawn_items or 0,
            "by_rarity": rarity_data,
            "most_valuable_item": {
                "name": most_valuable.item_name if most_valuable else None,
                "value": float(most_valuable.item_value) if most_valuable else 0,
                "rarity": most_valuable.rarity if most_valuable else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting inventory stats for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get inventory stats"
        )


@router.post("/{item_id}/sell", response_model=SellItemResponse)
async def sell_inventory_item(
    item_id: int,
    request: SellItemRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Продать предмет из инвентаря
    """
    try:
        # Получаем предмет с проверкой владельца
        item_result = await db.execute(
            select(InventoryItem, User)
            .join(User)
            .where(
                InventoryItem.id == item_id,
                InventoryItem.user_id == request.user_id,
                InventoryItem.is_withdrawn == False
            )
        )
        row = item_result.first()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found or already withdrawn"
            )
        
        item, user = row
        
        # Начинаем транзакцию
        # 1. Добавляем звезды пользователю
        new_balance = user.balance_stars + item.item_stars
        
        await db.execute(
            update(User)
            .where(User.id == request.user_id)
            .values(
                balance_stars=new_balance,
                total_earned_stars=User.total_earned_stars + item.item_stars
            )
        )
        
        # 2. Создаем транзакцию продажи
        sale_transaction = Transaction(
            user_id=request.user_id,
            type="item_sale",
            amount=item.item_stars,
            currency="STARS",
            status="completed",
            description=f"Sold item: {item.item_name}",
            completed_at=datetime.utcnow()
        )
        db.add(sale_transaction)
        
        # 3. Удаляем предмет из инвентаря
        await db.execute(
            delete(InventoryItem).where(InventoryItem.id == item_id)
        )
        
        # Сохраняем изменения
        await db.commit()
        
        logger.info(
            f"User {request.user_id} sold item {item.item_name} for {item.item_stars} stars"
        )
        
        return SellItemResponse(
            success=True,
            stars_earned=item.item_stars,
            new_balance=new_balance,
            message=f"Предмет '{item.item_name}' продан за {item.item_stars:,} звёзд"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selling item {item_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sell item"
        )


@router.post("/{item_id}/withdraw", response_model=WithdrawItemResponse)
async def request_item_withdrawal(
    item_id: int,
    request: WithdrawItemRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Запросить вывод предмета
    """
    try:
        # Получаем предмет с проверкой владельца
        item_result = await db.execute(
            select(InventoryItem, User)
            .join(User)
            .where(
                InventoryItem.id == item_id,
                InventoryItem.user_id == request.user_id,
                InventoryItem.is_withdrawn == False
            )
        )
        row = item_result.first()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found or already withdrawn"
            )
        
        item, user = row
        
        # Проверяем минимальную стоимость для вывода (например, от 1000 звезд)
        if item.item_stars < 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item value too low for withdrawal. Minimum: 1000 stars"
            )
        
        # Помечаем предмет как запрошенный к выводу
        await db.execute(
            update(InventoryItem)
            .where(InventoryItem.id == item_id)
            .values(
                is_withdrawn=True,
                withdrawal_requested_at=datetime.utcnow()
            )
        )
        
        # Создаем транзакцию вывода
        withdrawal_transaction = Transaction(
            user_id=request.user_id,
            type="item_withdrawal",
            amount=item.item_stars,
            currency="STARS",
            status="pending",
            description=f"Withdrawal request: {item.item_name}",
            extra_data=f'{{"item_id": {item_id}, "contact_info": "{request.contact_info or ""}"}}',
        )
        db.add(withdrawal_transaction)
        
        await db.commit()
        
        # TODO: Отправить уведомление администратору о запросе вывода
        await notify_admin_withdrawal_request(user, item, request.contact_info)
        
        logger.info(
            f"User {request.user_id} requested withdrawal for item {item.item_name}"
        )
        
        return WithdrawItemResponse(
            success=True,
            message=f"Запрос на вывод предмета '{item.item_name}' отправлен. Администратор свяжется с вами в течение 24 часов."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting withdrawal for item {item_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to request withdrawal"
        )


@router.get("/{user_id}/withdrawals")
async def get_withdrawal_requests(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Получить список запросов на вывод пользователя
    """
    try:
        # Проверяем существование пользователя
        user_exists = await db.scalar(
            select(User.id).where(User.id == user_id)
        )
        
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Получаем предметы, запрошенные к выводу
        result = await db.execute(
            select(InventoryItem)
            .where(
                InventoryItem.user_id == user_id,
                InventoryItem.is_withdrawn == True
            )
            .order_by(InventoryItem.withdrawal_requested_at.desc())
        )
        
        withdrawn_items = result.scalars().all()
        
        # Получаем связанные транзакции вывода
        transactions_result = await db.execute(
            select(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.type == "item_withdrawal"
            )
            .order_by(Transaction.created_at.desc())
        )
        
        transactions = transactions_result.scalars().all()
        
        return {
            "withdrawn_items": [
                {
                    "id": item.id,
                    "name": item.item_name,
                    "value": float(item.item_value),
                    "stars": item.item_stars,
                    "rarity": item.rarity,
                    "requested_at": item.withdrawal_requested_at.isoformat() if item.withdrawal_requested_at else None,
                    "status": "pending"  # В дальнейшем можно добавить статусы
                }
                for item in withdrawn_items
            ],
            "transactions": [
                {
                    "id": tx.id,
                    "amount": float(tx.amount),
                    "status": tx.status,
                    "description": tx.description,
                    "created_at": tx.created_at.isoformat(),
                    "completed_at": tx.completed_at.isoformat() if tx.completed_at else None
                }
                for tx in transactions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting withdrawal requests for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get withdrawal requests"
        )


@router.delete("/{item_id}", response_model=SuccessResponse)
async def delete_inventory_item(
    item_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Удалить предмет из инвентаря (только для администраторов)
    """
    try:
        # Проверяем существование предмета
        item_result = await db.execute(
            select(InventoryItem)
            .where(
                InventoryItem.id == item_id,
                InventoryItem.user_id == user_id
            )
        )
        item = item_result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        # Удаляем предмет
        await db.execute(
            delete(InventoryItem).where(InventoryItem.id == item_id)
        )
        
        await db.commit()
        
        logger.info(f"Deleted item {item_id} from user {user_id} inventory")
        
        return SuccessResponse(
            message=f"Item '{item.item_name}' deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting item {item_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete item"
        )


async def notify_admin_withdrawal_request(user: User, item: InventoryItem, contact_info: Optional[str]):
    """
    Уведомление администратора о запросе вывода
    """
    try:
        from ..payments.telegram import telegram_service
        
        # ID администратора (нужно указать реальный)
        ADMIN_TELEGRAM_ID = 123456789  # Замените на реальный ID
        
        message = f"""
🔔 *Новый запрос на вывод*

👤 Пользователь: {user.first_name or 'Unknown'} (@{user.username or 'no_username'})
🆔 User ID: {user.id}
📱 Telegram ID: {user.telegram_id}

🎁 Предмет: {item.item_name}
💎 Редкость: {item.rarity}
⭐ Стоимость: {item.item_stars:,} звёзд
💰 Эквивалент: {float(item.item_value):.2f} TON

📞 Контакт: {contact_info or 'Не указан'}

📅 Время запроса: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
        """.strip()
        
        await telegram_service.send_message(ADMIN_TELEGRAM_ID, message)
        
    except Exception as e:
        logger.error(f"Failed to notify admin about withdrawal request: {str(e)}")
        # Не прерываем основной процесс при ошибке уведомления