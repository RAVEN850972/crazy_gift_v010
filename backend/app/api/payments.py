from decimal import Decimal
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ..database import get_db
from ..models import User, Transaction
from ..schemas import (
    TonDepositRequest, StarsDepositRequest, TonTransactionResponse,
    StarsInvoiceResponse, WebhookTonRequest, WebhookTelegramRequest,
    TransactionResponse, SuccessResponse
)
from ..payments.ton import ton_service
from ..payments.telegram import telegram_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ton/deposit", response_model=TonTransactionResponse)
async def create_ton_deposit(
    request: TonDepositRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Создать депозит TON
    """
    try:
        # Проверяем пользователя
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Валидируем сумму
        if request.amount <= 0 or request.amount > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid amount. Must be between 0.01 and 1000 TON"
            )
        
        amount_decimal = Decimal(str(request.amount))
        
        # Создаем транзакцию в БД
        transaction = Transaction(
            user_id=request.user_id,
            type="deposit_ton",
            amount=amount_decimal,
            currency="TON",
            status="pending",
            description=f"TON deposit: {amount_decimal} TON"
        )
        
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        
        # Создаем TON транзакцию
        ton_transaction = await ton_service.create_deposit_transaction(
            request.user_id, 
            amount_decimal
        )
        
        logger.info(f"Created TON deposit for user {request.user_id}: {amount_decimal} TON")
        
        return TonTransactionResponse(
            transaction_id=transaction.id,
            ton_transaction=ton_transaction
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating TON deposit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create deposit"
        )


@router.post("/stars/invoice", response_model=StarsInvoiceResponse)
async def create_stars_invoice(
    request: StarsDepositRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Создать инвойс для покупки Telegram Stars
    """
    try:
        # Проверяем пользователя и получаем его Telegram ID
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Валидируем количество звезд
        if request.stars_amount <= 0 or request.stars_amount > 100000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid stars amount. Must be between 1 and 100,000"
            )
        
        # Создаем транзакцию в БД
        transaction = Transaction(
            user_id=request.user_id,
            type="deposit_stars",
            amount=Decimal(request.stars_amount),
            currency="STARS",
            status="pending",
            description=f"Stars purchase: {request.stars_amount} stars"
        )
        
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        
        # Создаем инвойс в Telegram
        invoice_link = await telegram_service.create_stars_invoice(
            request.user_id,
            request.stars_amount,
            user.telegram_id
        )
        
        logger.info(f"Created Stars invoice for user {request.user_id}: {request.stars_amount} stars")
        
        return StarsInvoiceResponse(
            invoice_link=invoice_link,
            transaction_id=transaction.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Stars invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invoice"
        )


@router.post("/webhook/ton", response_model=SuccessResponse)
async def ton_webhook(
    request: WebhookTonRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook для подтверждения TON платежа
    """
    try:
        # Проверяем существование транзакции
        transaction_result = await db.execute(
            select(Transaction).where(
                Transaction.id == request.transaction_id,
                Transaction.type == "deposit_ton",
                Transaction.status == "pending"
            )
        )
        transaction = transaction_result.scalar_one_or_none()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found or already processed"
            )
        
        # Обновляем статус на "processing"
        await db.execute(
            update(Transaction)
            .where(Transaction.id == request.transaction_id)
            .values(
                status="processing",
                external_id=request.tx_hash
            )
        )
        await db.commit()
        
        # Запускаем проверку в фоне
        background_tasks.add_task(
            process_ton_payment,
            request.transaction_id,
            request.tx_hash
        )
        
        logger.info(f"TON webhook received for transaction {request.transaction_id}")
        
        return SuccessResponse(
            message="Payment verification started",
            data={"transaction_id": request.transaction_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing TON webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


@router.post("/webhook/telegram", response_model=SuccessResponse)
async def telegram_webhook(
    request: WebhookTelegramRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook для подтверждения Telegram Stars платежа
    """
    try:
        # Проверяем существование транзакции
        transaction_result = await db.execute(
            select(Transaction).where(
                Transaction.id == request.transaction_id,
                Transaction.type == "deposit_stars",
                Transaction.status == "pending"
            )
        )
        transaction = transaction_result.scalar_one_or_none()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found or already processed"
            )
        
        # Обновляем статус
        await db.execute(
            update(Transaction)
            .where(Transaction.id == request.transaction_id)
            .values(
                status="processing",
                external_id=request.payment_id
            )
        )
        await db.commit()
        
        # Запускаем обработку в фоне
        background_tasks.add_task(
            process_telegram_payment,
            request.transaction_id,
            request.payment_id,
            request.status
        )
        
        logger.info(f"Telegram webhook received for transaction {request.transaction_id}")
        
        return SuccessResponse(
            message="Payment verification started",
            data={"transaction_id": request.transaction_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


@router.get("/transaction/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: int, db: AsyncSession = Depends(get_db)):
    """
    Получить информацию о транзакции
    """
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return TransactionResponse.model_validate(transaction)


# Фоновые задачи для обработки платежей

async def process_ton_payment(transaction_id: int, tx_hash: str):
    """Обработка TON платежа в фоне"""
    from ..database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        try:
            # Получаем транзакцию
            result = await db.execute(
                select(Transaction, User).join(User)
                .where(Transaction.id == transaction_id)
            )
            row = result.first()
            
            if not row:
                logger.error(f"Transaction {transaction_id} not found")
                return
            
            transaction, user = row
            
            # Создаем memo для проверки
            memo = f"deposit_{user.id}_{int(transaction.amount * 100)}"
            
            # Проверяем транзакцию в блокчейне
            is_valid = await ton_service.verify_transaction(
                tx_hash, 
                transaction.amount, 
                memo
            )
            
            if is_valid:
                # Конвертируем TON в звезды (1 TON = 100 stars)
                stars_amount = int(transaction.amount * 100)
                
                # Обновляем баланс пользователя
                await db.execute(
                    update(User)
                    .where(User.id == user.id)
                    .values(balance_stars=User.balance_stars + stars_amount)
                )
                
                # Обновляем статус транзакции
                await db.execute(
                    update(Transaction)
                    .where(Transaction.id == transaction_id)
                    .values(
                        status="completed",
                        completed_at=datetime.utcnow()
                    )
                )
                
                await db.commit()
                
                # Отправляем уведомление (если есть Telegram ID)
                new_balance = user.balance_stars + stars_amount
                await telegram_service.notify_payment_success(
                    user.telegram_id,
                    stars_amount,
                    new_balance
                )
                
                logger.info(f"TON payment {transaction_id} completed successfully")
                
            else:
                # Помечаем как неудачную
                await db.execute(
                    update(Transaction)
                    .where(Transaction.id == transaction_id)
                    .values(status="failed")
                )
                await db.commit()
                
                await telegram_service.notify_payment_failed(
                    user.telegram_id,
                    "Transaction verification failed"
                )
                
                logger.warning(f"TON payment {transaction_id} verification failed")
                
        except Exception as e:
            logger.error(f"Error processing TON payment {transaction_id}: {str(e)}")
            
            # Помечаем как ошибку
            try:
                await db.execute(
                    update(Transaction)
                    .where(Transaction.id == transaction_id)
                    .values(status="failed")
                )
                await db.commit()
            except:
                pass


async def process_telegram_payment(transaction_id: int, payment_id: str, payment_status: str):
    """Обработка Telegram Stars платежа в фоне"""
    from ..database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        try:
            # Получаем транзакцию
            result = await db.execute(
                select(Transaction, User).join(User)
                .where(Transaction.id == transaction_id)
            )
            row = result.first()
            
            if not row:
                logger.error(f"Transaction {transaction_id} not found")
                return
            
            transaction, user = row
            
            if payment_status == "paid":
                # Платеж успешен
                stars_amount = int(transaction.amount)
                
                # Обновляем баланс пользователя
                await db.execute(
                    update(User)
                    .where(User.id == user.id)
                    .values(balance_stars=User.balance_stars + stars_amount)
                )
                
                # Обновляем статус транзакции
                await db.execute(
                    update(Transaction)
                    .where(Transaction.id == transaction_id)
                    .values(
                        status="completed",
                        completed_at=datetime.utcnow()
                    )
                )
                
                await db.commit()
                
                # Отправляем уведомление
                new_balance = user.balance_stars + stars_amount
                await telegram_service.notify_payment_success(
                    user.telegram_id,
                    stars_amount,
                    new_balance
                )
                
                logger.info(f"Telegram payment {transaction_id} completed successfully")
                
            else:
                # Платеж неудачен
                await db.execute(
                    update(Transaction)
                    .where(Transaction.id == transaction_id)
                    .values(status="failed")
                )
                await db.commit()
                
                await telegram_service.notify_payment_failed(
                    user.telegram_id,
                    f"Payment status: {payment_status}"
                )
                
                logger.warning(f"Telegram payment {transaction_id} failed with status: {payment_status}")
                
        except Exception as e:
            logger.error(f"Error processing Telegram payment {transaction_id}: {str(e)}")
            
            # Помечаем как ошибку
            try:
                await db.execute(
                    update(Transaction)
                    .where(Transaction.id == transaction_id)
                    .values(status="failed")
                )
                await db.commit()
            except:
                pass