from sqlalchemy import Column, Integer, String, Boolean, DECIMAL, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    """Модель пользователя"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, nullable=False, index=True)
    username = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    
    # Балансы
    balance_stars = Column(Integer, default=0, nullable=False)
    balance_ton = Column(DECIMAL(18, 9), default=0, nullable=False)
    
    # Реферальная система
    referral_code = Column(String(20), unique=True, nullable=True, index=True)
    referred_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Статистика
    total_cases_opened = Column(Integer, default=0)
    total_spent_stars = Column(Integer, default=0)
    total_earned_stars = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_active = Column(DateTime, server_default=func.now())
    
    # Relationships
    inventory_items = relationship("InventoryItem", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    referrals = relationship("User", remote_side=[id])

    def __repr__(self):
        return f"<User(id={self.id}, telegram_id={self.telegram_id}, username={self.username})>"


class InventoryItem(Base):
    """Модель предмета в инвентаре"""
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Информация о предмете
    item_name = Column(String(255), nullable=False)
    item_value = Column(DECIMAL(10, 2), nullable=False)
    item_stars = Column(Integer, nullable=False)
    rarity = Column(String(50), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    
    # Мета информация
    case_name = Column(String(255), nullable=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    
    # Статус предмета
    is_withdrawn = Column(Boolean, default=False, nullable=False)
    is_upgraded = Column(Boolean, default=False, nullable=False)
    withdrawal_requested_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="inventory_items")
    case = relationship("Case", back_populates="items_in_inventory")

    def __repr__(self):
        return f"<InventoryItem(id={self.id}, name={self.item_name}, user_id={self.user_id})>"


class Transaction(Base):
    """Модель транзакции"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Тип транзакции
    type = Column(String(50), nullable=False, index=True)  
    # Возможные типы: deposit_ton, deposit_stars, case_purchase, item_sale, referral_bonus
    
    # Сумма и валюта
    amount = Column(DECIMAL(18, 9), nullable=False)
    currency = Column(String(10), nullable=False)  # TON, STARS
    
    # Статус
    status = Column(String(20), default="pending", nullable=False, index=True)
    # Возможные статусы: pending, processing, completed, failed, cancelled
    
    # Внешние идентификаторы
    external_id = Column(String(255), nullable=True, index=True)  # TON hash или Telegram payment ID
    
    # Дополнительная информация
    description = Column(Text, nullable=True)
    extra_data = Column(Text, nullable=True)  # Переименовано с metadata на extra_data
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction(id={self.id}, type={self.type}, amount={self.amount}, status={self.status})>"


class Case(Base):
    """Модель кейса"""
    __tablename__ = "cases"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Цена
    price_stars = Column(Integer, nullable=False)
    
    # Содержимое кейса (JSON)
    items = Column(Text, nullable=False)  # JSON строка с предметами и их весами
    
    # Статус и метаданные
    active = Column(Boolean, default=True, nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    
    # Статистика
    total_opened = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    items_in_inventory = relationship("InventoryItem", back_populates="case")

    def __repr__(self):
        return f"<Case(id={self.id}, name={self.name}, price={self.price_stars})>"


class ReferralTransaction(Base):
    """Модель реферальных транзакций"""
    __tablename__ = "referral_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    referred_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Информация о комиссии
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    commission_amount = Column(Integer, nullable=False)  # Сумма комиссии в звездах
    commission_rate = Column(DECIMAL(5, 4), nullable=False)  # Процент комиссии (например, 0.1 = 10%)
    
    # Статус
    status = Column(String(20), default="pending", nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    paid_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<ReferralTransaction(referrer_id={self.referrer_id}, amount={self.commission_amount})>"


# Создаем индексы для оптимизации запросов
Index('idx_user_telegram_id', User.telegram_id)
Index('idx_inventory_user_rarity', InventoryItem.user_id, InventoryItem.rarity)
Index('idx_transaction_user_type', Transaction.user_id, Transaction.type)
Index('idx_transaction_status_created', Transaction.status, Transaction.created_at)