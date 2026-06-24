from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.orchestrator.router import router as orchestrator_router
from src.database import engine, Base, get_db
from src.models import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

app = FastAPI(title="LifeAgent API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(orchestrator_router)

@app.on_event("startup")
async def startup_event():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Ensure default user exists
    async with engine.begin() as conn:
        result = await conn.execute(select(User).where(User.id == 1))
        user = result.scalar_one_or_none()
        if not user:
            # Create default user
            default_user = User(
                id=1,
                username="demo_user",
                email="demo@lifeagent.com",
                password_hash="hashed_password_placeholder",
                token_balance=1000,
                theme_preference="light"
            )
            conn.add(default_user)
            await conn.commit()

@app.get("/")
async def root():
    return {"message": "LifeAgent API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
