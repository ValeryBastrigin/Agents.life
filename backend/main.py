from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from src.orchestrator.router import router as orchestrator_router
from src.secretary.router import router as secretary_router
from src.database import engine, Base, get_db, async_session
from src.models import User
from src.config import client
from sqlalchemy import select
from pydantic import ValidationError

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
app.include_router(secretary_router)

# Exception handler for validation errors
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    print(f"VALIDATION ERROR: {exc}")
    print(f"REQUEST BODY: {await request.body()}")
    return {"detail": exc.errors(), "body": exc.body}

@app.on_event("startup")
async def startup_event():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Ensure default user exists
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == 1))
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
            session.add(default_user)
            await session.commit()

@app.get("/")
async def root():
    return {"message": "LifeAgent API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
