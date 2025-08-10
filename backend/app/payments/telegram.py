import httpx
import json
from typing import Optional, Dict, Any
from ..config import settings
import logging

logger = logging.getLogger(__name__)


class TelegramStarsService:
    """Сервис для работы с Telegram Stars"""
    
    def __init__(self):
        self.bot_token = settings.telegram_bot_token
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
    
    async def create_stars_invoice(self, user_id: int, stars_amount: int, telegram_user_id: int) -> str:
        """
        Создание инвойса для покупки Telegram Stars
        
        Args:
            user_id: ID пользователя в нашей системе
            stars_amount: Количество звезд
            telegram_user_id: Telegram ID пользователя
            
        Returns:
            Ссылка на инвойс
        """
        try:
            # Создаем payload для идентификации платежа
            payload = json.dumps({
                "type": "stars_purchase",
                "user_id": user_id,
                "stars_amount": stars_amount,
                "timestamp": int(__import__("time").time())
            })
            
            invoice_data = {
                "title": "Пополнение баланса",
                "description": f"Покупка {stars_amount:,} звёзд в CrazyGift",
                "payload": payload,
                "currency": "XTR",  # Telegram Stars currency code
                "prices": json.dumps([{
                    "label": f"{stars_amount:,} звёзд",
                    "amount": stars_amount
                }])
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/createInvoiceLink",
                    data=invoice_data
                )
                
                if response.status_code != 200:
                    logger.error(f"Telegram API error: {response.status_code}")
                    raise Exception(f"Telegram API error: {response.status_code}")
                
                data = response.json()
                
                if not data.get("ok"):
                    error_msg = data.get("description", "Unknown error")
                    logger.error(f"Telegram API error: {error_msg}")
                    raise Exception(f"Telegram API error: {error_msg}")
                
                invoice_link = data["result"]
                logger.info(f"Created Stars invoice for user {user_id}: {stars_amount} stars")
                
                return invoice_link
                
        except Exception as e:
            logger.error(f"Failed to create Stars invoice: {str(e)}")
            raise
    
    async def verify_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """
        Проверка платежа Telegram Stars
        
        Args:
            payment_id: ID платежа от Telegram
            
        Returns:
            Информация о платеже или None
        """
        try:
            # Примечание: В реальном API Telegram может не быть прямого метода
            # для проверки платежа по ID. Обычно информация приходит через webhook
            # Этот метод для демонстрации структуры
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/getPayment",  # Гипотетический метод
                    json={"payment_id": payment_id}
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                if not data.get("ok"):
                    return None
                
                payment_info = data.get("result", {})
                
                return {
                    "payment_id": payment_id,
                    "amount": payment_info.get("total_amount"),
                    "currency": payment_info.get("currency"),
                    "status": payment_info.get("status"),
                    "payload": payment_info.get("invoice_payload"),
                    "user_id": payment_info.get("from", {}).get("id"),
                    "paid_at": payment_info.get("payment_date")
                }
                
        except Exception as e:
            logger.error(f"Error verifying Stars payment: {str(e)}")
            return None
    
    async def send_message(self, chat_id: int, text: str) -> bool:
        """
        Отправка сообщения пользователю
        
        Args:
            chat_id: Telegram chat ID
            text: Текст сообщения
            
        Returns:
            True если сообщение отправлено успешно
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "Markdown"
                    }
                )
                
                if response.status_code != 200:
                    return False
                
                data = response.json()
                return data.get("ok", False)
                
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            return False
    
    async def notify_payment_success(self, telegram_user_id: int, stars_amount: int, new_balance: int) -> bool:
        """
        Уведомление об успешном платеже
        
        Args:
            telegram_user_id: Telegram ID пользователя
            stars_amount: Количество купленных звезд
            new_balance: Новый баланс пользователя
            
        Returns:
            True если уведомление отправлено
        """
        message = f"""
🎉 *Платёж успешно обработан!*

💰 Получено: {stars_amount:,} звёзд
⭐ Ваш баланс: {new_balance:,} звёзд

Теперь вы можете открывать кейсы и выигрывать призы!
        """.strip()
        
        return await self.send_message(telegram_user_id, message)
    
    async def notify_payment_failed(self, telegram_user_id: int, reason: str = "") -> bool:
        """
        Уведомление о неудачном платеже
        
        Args:
            telegram_user_id: Telegram ID пользователя
            reason: Причина неудачи
            
        Returns:
            True если уведомление отправлено
        """
        message = f"""
❌ *Ошибка платежа*

К сожалению, не удалось обработать ваш платёж.
{f"Причина: {reason}" if reason else ""}

Попробуйте ещё раз или обратитесь в поддержку.
        """.strip()
        
        return await self.send_message(telegram_user_id, message)
    
    def parse_payment_payload(self, payload: str) -> Optional[Dict[str, Any]]:
        """
        Парсинг payload из платежа
        
        Args:
            payload: JSON строка с данными платежа
            
        Returns:
            Распарсенные данные или None
        """
        try:
            data = json.loads(payload)
            
            # Проверяем обязательные поля
            if data.get("type") != "stars_purchase":
                return None
            
            if "user_id" not in data or "stars_amount" not in data:
                return None
            
            return data
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Error parsing payment payload: {str(e)}")
            return None
    
    async def get_bot_info(self) -> Optional[Dict[str, Any]]:
        """
        Получение информации о боте
        
        Returns:
            Информация о боте или None
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.api_url}/getMe")
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                if not data.get("ok"):
                    return None
                
                return data.get("result")
                
        except Exception as e:
            logger.error(f"Error getting bot info: {str(e)}")
            return None


# Создаем глобальный экземпляр сервиса
telegram_service = TelegramStarsService()