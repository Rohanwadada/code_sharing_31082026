from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings

engine = create_async_engine(
    url=str(settings.database_url),
    # Pool settings
    pool_size=10,  # Keep up to 10 idle/open connections
    max_overflow=20,  # Allow 20 extra during traffic spikes
    pool_timeout=30,  # Wait 30s for a connection
    pool_recycle=1800,  # Recycle after 30 minutes
    pool_pre_ping=True,  # Verify connection before using it
    echo=False,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)
