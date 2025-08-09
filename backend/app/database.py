from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool
from .config import settings

# Создаем движок БД
if settings.database_url.startswith("sqlite"):
    # SQLite настройки
    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
    )
else:
    # PostgreSQL настройки (для будущего использования)
    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
        pool_recycle=300,
    )

# Создаем фабрику сессий
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Базовый класс для моделей
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency для получения сессии БД"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Создание всех таблиц в БД"""
    async with engine.begin() as conn:
        # Импортируем все модели чтобы они были зарегистрированы
        from . import models
        
        # Создаем все таблицы
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")


async def close_db():
    """Закрытие соединения с БД"""
    await engine.dispose()
    print("✅ Database connection closed")