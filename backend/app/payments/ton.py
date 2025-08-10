import httpx
import asyncio
from decimal import Decimal
from typing import Optional, Dict, Any
from ..config import settings
import logging

logger = logging.getLogger(__name__)


class TonPaymentService:
    """Сервис для работы с TON платежами"""
    
    def __init__(self):
        self.api_url = "https://testnet.toncenter.com/api/v2" if settings.ton_testnet else "https://toncenter.com/api/v2"
        self.api_key = settings.ton_api_key
        self.wallet_address = settings.ton_wallet_address
        
    async def create_deposit_transaction(self, user_id: int, amount: Decimal) -> Dict[str, Any]:
        """
        Создание транзакции для депозита TON
        
        Args:
            user_id: ID пользователя
            amount: Сумма в TON
            
        Returns:
            Данные для TON Connect транзакции
        """
        try:
            # Конвертируем TON в nanotons (1 TON = 10^9 nanotons)
            nanotons = str(int(amount * 10**9))
            
            # Создаем memo для идентификации платежа
            memo = f"deposit_{user_id}_{int(amount * 100)}"
            
            # Формируем транзакцию для TON Connect
            transaction = {
                "valid_until": int(asyncio.get_event_loop().time()) + 600,  # 10 минут
                "messages": [
                    {
                        "address": self.wallet_address,
                        "amount": nanotons,
                        "payload": memo
                    }
                ]
            }
            
            logger.info(f"Created TON transaction: {memo}, amount: {amount} TON")
            
            return transaction
            
        except Exception as e:
            logger.error(f"Failed to create TON transaction: {str(e)}")
            raise
    
    async def verify_transaction(self, tx_hash: str, expected_amount: Decimal, memo: str) -> bool:
        """
        Проверка транзакции в блокчейне TON
        
        Args:
            tx_hash: Хеш транзакции
            expected_amount: Ожидаемая сумма в TON
            memo: Ожидаемое memo
            
        Returns:
            True если транзакция валидна
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Получаем информацию о транзакции
                response = await client.get(
                    f"{self.api_url}/getTransactions",
                    params={
                        "address": self.wallet_address,
                        "limit": 100,
                        "api_key": self.api_key
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"TON API error: {response.status_code}")
                    return False
                
                data = response.json()
                if not data.get("ok"):
                    logger.error(f"TON API response error: {data.get('error', 'Unknown error')}")
                    return False
                
                transactions = data.get("result", [])
                
                # Ищем нашу транзакцию
                for tx in transactions:
                    tx_id = tx.get("transaction_id", {})
                    if tx_id.get("hash") == tx_hash:
                        # Проверяем входящее сообщение
                        in_msg = tx.get("in_msg", {})
                        if not in_msg:
                            continue
                        
                        # Проверяем сумму (конвертируем из nanotons)
                        value_nanotons = int(in_msg.get("value", 0))
                        value_ton = Decimal(value_nanotons) / Decimal(10**9)
                        
                        # Допускаем погрешность в 0.001 TON
                        if abs(value_ton - expected_amount) > Decimal("0.001"):
                            logger.warning(f"Amount mismatch: expected {expected_amount}, got {value_ton}")
                            continue
                        
                        # Проверяем memo (если есть)
                        tx_memo = in_msg.get("message", "")
                        if memo and memo not in tx_memo:
                            logger.warning(f"Memo mismatch: expected {memo}, got {tx_memo}")
                            continue
                        
                        # Проверяем, что транзакция успешна
                        if tx.get("out_msgs") is not None:  # Есть исходящие сообщения = успешна
                            logger.info(f"Transaction verified: {tx_hash}")
                            return True
                
                logger.warning(f"Transaction not found or invalid: {tx_hash}")
                return False
                
        except Exception as e:
            logger.error(f"Error verifying TON transaction: {str(e)}")
            return False
    
    async def get_wallet_balance(self) -> Optional[Decimal]:
        """
        Получить баланс кошелька
        
        Returns:
            Баланс в TON или None при ошибке
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_url}/getAddressBalance",
                    params={
                        "address": self.wallet_address,
                        "api_key": self.api_key
                    }
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                if not data.get("ok"):
                    return None
                
                # Конвертируем из nanotons в TON
                balance_nanotons = int(data.get("result", 0))
                balance_ton = Decimal(balance_nanotons) / Decimal(10**9)
                
                return balance_ton
                
        except Exception as e:
            logger.error(f"Error getting wallet balance: {str(e)}")
            return None
    
    async def get_transaction_details(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """
        Получить детали транзакции
        
        Args:
            tx_hash: Хеш транзакции
            
        Returns:
            Детали транзакции или None
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_url}/getTransactions",
                    params={
                        "address": self.wallet_address,
                        "limit": 100,
                        "api_key": self.api_key
                    }
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                if not data.get("ok"):
                    return None
                
                transactions = data.get("result", [])
                
                for tx in transactions:
                    tx_id = tx.get("transaction_id", {})
                    if tx_id.get("hash") == tx_hash:
                        in_msg = tx.get("in_msg", {})
                        
                        return {
                            "hash": tx_hash,
                            "timestamp": tx.get("utime", 0),
                            "value_nanotons": int(in_msg.get("value", 0)),
                            "value_ton": float(Decimal(in_msg.get("value", 0)) / Decimal(10**9)),
                            "from_address": in_msg.get("source", ""),
                            "message": in_msg.get("message", ""),
                            "success": tx.get("out_msgs") is not None
                        }
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting transaction details: {str(e)}")
            return None


# Создаем глобальный экземпляр сервиса
ton_service = TonPaymentService()