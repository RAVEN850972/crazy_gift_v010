from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import time
import logging

from .config import settings
from .database import init_db, close_db


# Настройка логирования
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    # Startup
    logger.info("🚀 Starting CrazyGift API...")
    
    # Инициализируем базу данных
    await init_db()
    
    # Загружаем тестовые данные если в режиме разработки
    if settings.debug:
        await load_test_data()
    
    logger.info("✅ CrazyGift API started successfully")
    
    yield
    
    # Shutdown
    logger.info("🔄 Shutting down CrazyGift API...")
    await close_db()
    logger.info("✅ CrazyGift API stopped")


# Создаем приложение FastAPI
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for CrazyGift Telegram WebApp Casino",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Настройка CORS\
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Middleware для логирования запросов

# Middleware для логирования запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Обрабатываем preflight OPTIONS запросы
    if request.method == "OPTIONS":
        response = JSONResponse(content={}, status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
    
    start_time = time.time()
    
    # Логируем входящий запрос
    logger.info(f"🔵 {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    # Логируем время выполнения
    process_time = time.time() - start_time
    logger.info(f"🟢 {request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    
    return response


# Обработчики ошибок
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Обработчик ошибок валидации"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Invalid request data",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Общий обработчик ошибок"""
    logger.error(f"❌ Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "details": str(exc) if settings.debug else None
        }
    )


# Подключение роутеров
from .api import users, cases, payments, inventory


# Health check endpoints
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Проверка состояния API"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": time.time()
    }

app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])


# Основные эндпоинты
@app.get("/")
async def root():
    """Главная страница API"""
    return {
        "message": "CrazyGift API is running",
        "version": settings.app_version,
        "status": "healthy",
        "docs": "/docs" if settings.debug else "disabled in production"
    }


@app.get("/health")
async def health_check():
    """Проверка состояния сервиса"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": settings.app_version
    }


@app.get("/api/stats")
async def get_public_stats():
    """Публичная статистика"""
    from sqlalchemy import select, func
    from .database import AsyncSessionLocal
    from .models import User, Transaction, Case
    
    async with AsyncSessionLocal() as db:
        # Общее количество пользователей
        users_count = await db.scalar(select(func.count(User.id)))
        
        # Общее количество открытых кейсов
        total_cases_opened = await db.scalar(select(func.sum(User.total_cases_opened))) or 0
        
        # Активные кейсы
        active_cases = await db.scalar(select(func.count(Case.id)).where(Case.active == True))
        
        return {
            "total_users": users_count or 0,
            "total_cases_opened": total_cases_opened,
            "active_cases": active_cases or 0,
            "online_now": "~300"  # Заглушка для фронтенда
        }


async def load_test_data():
    """Загрузка тестовых данных для разработки"""
    import json
    from sqlalchemy import select, func  # Добавили func
    from .database import AsyncSessionLocal
    from .models import Case
    
    logger.info("📦 Loading test data...")
    
    async with AsyncSessionLocal() as db:
        # Проверяем, есть ли уже кейсы
        existing_cases = await db.scalar(select(func.count(Case.id)))
        
        if existing_cases > 0:
            logger.info("Test data already exists, skipping...")
            return
        
        # Создаем тестовые кейсы
        test_cases = [
            {
                "name": "Telegram Case #1",
                "description": "Базовый кейс с обычными предметами",
                "price_stars": 150,
                "category": "basic",
                "image_url": "assets/cases/case1.png",
                "items": [
                    {"id": 1, "name": "Blue Bow Tie", "value": 25.6, "stars": 2556, "rarity": "common", "weight": 40, "image": "assets/gifts/gift2.png"},
                    {"id": 2, "name": "Pink Teddy Bear", "value": 45.5, "stars": 4550, "rarity": "common", "weight": 30, "image": "assets/gifts/gift3.png"},
                    {"id": 3, "name": "Telegram Cap", "value": 65.0, "stars": 6500, "rarity": "rare", "weight": 20, "image": "assets/gifts/gift4.png"},
                    {"id": 4, "name": "Golden Star", "value": 125.0, "stars": 12500, "rarity": "epic", "weight": 10, "image": "assets/gifts/gift5.png"}
                ]
            },
            {
                "name": "Telegram Case #2", 
                "description": "Улучшенный кейс с редкими предметами",
                "price_stars": 250,
                "category": "premium",
                "image_url": "assets/cases/case2.png",
                "items": [
                    {"id": 5, "name": "Magic Hat", "value": 85.0, "stars": 8500, "rarity": "rare", "weight": 35, "image": "assets/gifts/gift6.png"},
                    {"id": 6, "name": "Diamond Ring", "value": 180.5, "stars": 18050, "rarity": "epic", "weight": 25, "image": "assets/gifts/gift7.png"},
                    {"id": 7, "name": "Crown", "value": 350.0, "stars": 35000, "rarity": "legendary", "weight": 15, "image": "assets/gifts/gift8.png"},
                    {"id": 8, "name": "Mystic Scroll", "value": 750.0, "stars": 75000, "rarity": "mythic", "weight": 5, "image": "assets/gifts/gift9.png"}
                ]
            },
            {
                "name": "Premium Case",
                "description": "Эксклюзивный кейс с легендарными предметами",
                "price_stars": 500,
                "category": "premium",
                "image_url": "assets/cases/case_mock.png",
                "items": [
                    {"id": 9, "name": "Rare Artifact", "value": 450.0, "stars": 45000, "rarity": "legendary", "weight": 40, "image": "assets/gifts/gift10.png"},
                    {"id": 10, "name": "Ancient Relic", "value": 850.0, "stars": 85000, "rarity": "mythic", "weight": 30, "image": "assets/gifts/gift11.png"},
                    {"id": 11, "name": "Dragon Egg", "value": 1500.0, "stars": 150000, "rarity": "mythic", "weight": 20, "image": "assets/gifts/gift12.png"},
                    {"id": 12, "name": "Ultimate Prize", "value": 3000.0, "stars": 300000, "rarity": "mythic", "weight": 10, "image": "assets/gifts/gift1.png"}
                ]
            }
        ]
        
        for case_data in test_cases:
            case = Case(
                name=case_data["name"],
                description=case_data["description"],
                price_stars=case_data["price_stars"],
                category=case_data["category"],
                image_url=case_data["image_url"],
                items=json.dumps(case_data["items"]),
                active=True
            )
            db.add(case)
        
        await db.commit()
        logger.info(f"✅ Created {len(test_cases)} test cases")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info" if settings.debug else "warning"
    )