from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Convert standard postgresql:// to postgresql+asyncpg://
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip()
    
if not DATABASE_URL:
    # Fallback to loading from .env if environment variable is missing
    load_dotenv("/app/.env")
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL:
        DATABASE_URL = DATABASE_URL.strip()

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

if not DATABASE_URL:
    print("CRITICAL: DATABASE_URL is not set!")
else:
    # Log host only for safety, stripping any trailing paths
    host_info = DATABASE_URL.split('@')[-1].split('/')[0]
    print(f"Connecting to database host: {host_info}")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
