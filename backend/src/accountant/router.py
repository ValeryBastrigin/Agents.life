from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional

from src.database import get_db
from src.models import FinancialObligation

router = APIRouter(prefix="/api/accountant", tags=["accountant"])


class ObligationCreate(BaseModel):
    date: int
    title: str
    amount: int
    type: str  # 'income' or 'expense'


class ObligationOut(ObligationCreate):
    id: int
    user_id: int


class ObligationUpdate(BaseModel):
    date: Optional[int] = None
    title: Optional[str] = None
    amount: Optional[int] = None
    type: Optional[str] = None


@router.get("/obligations/{user_id}", response_model=List[ObligationOut])
async def get_obligations(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FinancialObligation).where(FinancialObligation.user_id == user_id)
    )
    obligations = result.scalars().all()
    return [
        ObligationOut(
            id=o.id,
            user_id=o.user_id,
            date=o.date,
            title=o.title,
            amount=o.amount,
            type=o.type,
        )
        for o in obligations
    ]


@router.post("/obligations/{user_id}", response_model=ObligationOut, status_code=201)
async def create_obligation(user_id: int, data: ObligationCreate, db: AsyncSession = Depends(get_db)):
    obligation = FinancialObligation(
        user_id=user_id,
        date=data.date,
        title=data.title,
        amount=data.amount,
        type=data.type,
    )
    db.add(obligation)
    await db.commit()
    await db.refresh(obligation)
    return ObligationOut(
        id=obligation.id,
        user_id=obligation.user_id,
        date=obligation.date,
        title=obligation.title,
        amount=obligation.amount,
        type=obligation.type,
    )


@router.delete("/obligations/{obligation_id}", status_code=204)
async def delete_obligation(obligation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FinancialObligation).where(FinancialObligation.id == obligation_id)
    )
    obligation = result.scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")
    await db.delete(obligation)
    await db.commit()
