from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.orchestrator.router import router as orchestrator_router
from src.database import engine, Base

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

@app.get("/")
async def root():
    return {"message": "LifeAgent API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
