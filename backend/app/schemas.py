from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ================= USER SCHEMAS =================

class UserBase(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    referral_code: Optional[str] = None
    referred_by: Optional[int] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    balance_stars: int = 0
    balance_ton: Decimal = Field(default=0, decimal_places=9)
    referral_code: Optional[str] = None
    total_cases_opened: int = 0
    created_at: datetime
    last_active: datetime


class UserProfileResponse(UserResponse):
    total_spent_stars: int = 0
    total_earned_stars: int = 0


# ================= INVENTORY SCHEMAS =================

class InventoryItemBase(BaseModel):
    item_name: str
    item_value: Decimal = Field(decimal_places=2)
    item_stars: int
    rarity: str
    image_url: Optional[str] = None


class InventoryItemCreate(InventoryItemBase):
    user_id: int
    case_name: Optional[str] = None
    case_id: Optional[int] = None


class InventoryItemResponse(InventoryItemBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    case_name: Optional[str] = None
    is_withdrawn: bool = False
    is_upgraded: bool = False
    created_at: datetime


# ================= TRANSACTION SCHEMAS =================

class TransactionBase(BaseModel):
    type: str
    amount: Decimal = Field(decimal_places=9)
    currency: str
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    user_id: int
    external_id: Optional[str] = None
    metadata: Optional[str] = None


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    status: str
    external_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


# ================= CASE SCHEMAS =================

class CaseItem(BaseModel):
    """Предмет внутри кейса"""
    id: int
    name: str
    value: float
    stars: int
    rarity: str
    weight: int
    image: str


class CaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    price_stars: int
    image_url: Optional[str] = None
    category: Optional[str] = None


class CaseCreate(CaseBase):
    items: List[CaseItem]


class CaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_stars: Optional[int] = None
    items: Optional[List[CaseItem]] = None
    active: Optional[bool] = None
    image_url: Optional[str] = None
    category: Optional[str] = None


class CaseResponse(CaseBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    active: bool = True
    total_opened: int = 0
    created_at: datetime


class CaseDetailResponse(CaseResponse):
    items: List[CaseItem]


# ================= PAYMENT SCHEMAS =================

class TonDepositRequest(BaseModel):
    user_id: int
    amount: float = Field(gt=0, description="Amount in TON")


class StarsDepositRequest(BaseModel):
    user_id: int
    stars_amount: int = Field(gt=0, description="Amount in Telegram Stars")


class TonTransactionResponse(BaseModel):
    transaction_id: int
    ton_transaction: dict


class StarsInvoiceResponse(BaseModel):
    invoice_link: str
    transaction_id: int


class WebhookTonRequest(BaseModel):
    transaction_id: int
    tx_hash: str


class WebhookTelegramRequest(BaseModel):
    transaction_id: int
    payment_id: str
    status: str


# ================= CASE OPENING SCHEMAS =================

class CaseOpenRequest(BaseModel):
    user_id: int


class CaseOpenResponse(BaseModel):
    success: bool
    item: Optional[InventoryItemResponse] = None
    new_balance: int
    message: str


# ================= INVENTORY ACTION SCHEMAS =================

class SellItemRequest(BaseModel):
    user_id: int


class SellItemResponse(BaseModel):
    success: bool
    stars_earned: int
    new_balance: int
    message: str


class WithdrawItemRequest(BaseModel):
    user_id: int
    contact_info: Optional[str] = None


class WithdrawItemResponse(BaseModel):
    success: bool
    message: str


# ================= AUTH SCHEMAS =================

class TelegramAuthRequest(BaseModel):
    init_data: str


class TelegramAuthResponse(BaseModel):
    success: bool
    user: UserResponse
    access_token: Optional[str] = None


# ================= ADMIN SCHEMAS =================

class AdminStatsResponse(BaseModel):
    total_users: int
    total_cases_opened: int
    total_transactions: int
    total_revenue_stars: int
    total_revenue_ton: Decimal
    active_cases: int


class AdminUserResponse(UserProfileResponse):
    referrals_count: int
    last_transaction: Optional[datetime] = None


# ================= HISTORY SCHEMAS =================

class HistoryFilter(BaseModel):
    user_id: Optional[int] = None
    transaction_type: Optional[str] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)


class HistoryResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    has_more: bool


# ================= ERROR SCHEMAS =================

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None


class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[dict] = None