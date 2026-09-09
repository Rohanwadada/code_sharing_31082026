import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

current_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.dirname(current_dir)                    
backend_root = os.path.dirname(app_dir)                  

path_1 = os.path.join(backend_root, '.env')
path_2 = os.path.join(app_dir, '.env')

# Try Path 1 (backend root)
if os.path.exists(path_1):
    load_dotenv(dotenv_path=path_1)
elif os.path.exists(path_2):
    load_dotenv(dotenv_path=path_2)
else:
    load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# ==============================================================================
# CRITICAL VALIDATION & DIAGNOSTIC PRINTS
# ==============================================================================
if not SQLALCHEMY_DATABASE_URL:
    print("\n" + "="*80)
    print("DIAGNOSTIC ERROR: 'DATABASE_URL' COULD NOT BE FOUND!")
    print(f"1. Checked for file at: {path_1} -> {'FOUND' if os.path.exists(path_1) else 'NOT FOUND'}")
    print(f"2. Checked for file at: {path_2} -> {'FOUND' if os.path.exists(path_2) else 'NOT FOUND'}")
    print("\nPRO TIP: Make sure your .env file contains exactly this line format:")
    print("DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/your_db")

    print("="*80 + "\n")
    
    raise ValueError("CRITICAL ERROR: 'DATABASE_URL' environment variable could not be loaded.")

# ==============================================================================
# INITIALIZE SQLALCHEMY
# ==============================================================================
engine = create_async_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False,)

Base = declarative_base() 

async def get_db():
    """
    Yields a database session to FastAPI endpoints and ensures it is
    safely closed once the web request lifecycle completes.
    """
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()


