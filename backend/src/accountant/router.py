import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
import json
import io
import os
from datetime import datetime, date

from src.database import get_db
from src.models import FinancialObligation, BankStatement, Transaction
from src.agents.statement_agent import process_statement_chunk

router = APIRouter(prefix="/api/accountant", tags=["accountant"])


def _extract_text_from_pdf(content_bytes: bytes) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    try:
        doc = fitz.open(stream=content_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts)
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""


def _is_pdf(content_bytes: bytes) -> bool:
    """Check if bytes look like a PDF file."""
    return content_bytes[:5] == b"%PDF-"


def _extract_text_from_bytes(content_bytes: bytes, filename: str = "") -> str:
    """Extract text from uploaded file bytes - handles PDF and plain text."""
    if _is_pdf(content_bytes) or filename.lower().endswith('.pdf'):
        print(f"Detected PDF file, extracting text...")
        pdf_text = _extract_text_from_pdf(content_bytes)
        if pdf_text.strip():
            print(f"Extracted {len(pdf_text)} chars from PDF")
            return pdf_text
        else:
            print("PDF extraction returned empty text")
    
    # Fallback: try to decode as plain text
    for encoding in ["utf-8", "cp1251", "latin-1"]:
        try:
            text = content_bytes.decode(encoding)
            # Check if it looks like readable text (not PDF binary)
            if not _is_pdf(content_bytes) or text.count('\n') > 10:
                return text
            return text
        except UnicodeDecodeError:
            continue
    
    # Last resort
    return content_bytes.decode("latin-1", errors="replace")


# ===== Obligations (existing) =====

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


# ===== Bank Statements =====

class TransactionOut(BaseModel):
    id: int
    date: Optional[str] = None
    description: str
    amount: float
    type: str
    category: str

    class Config:
        from_attributes = True


class StatementOut(BaseModel):
    id: int
    user_id: int
    filename: str
    bank_name: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    total_income: float
    total_expense: float
    categories_data: str  # JSON string
    categories: dict = {}  # parsed from categories_data
    analysis_text: str
    status: str
    created_at: Optional[str] = None
    transactions: List[TransactionOut] = []

    class Config:
        from_attributes = True


class StatementListItem(BaseModel):
    id: int
    filename: str
    bank_name: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    total_income: float
    total_expense: float
    categories_count: int
    status: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/statements/upload/{user_id}", response_model=StatementOut)
async def upload_statement(
    user_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a bank statement file, process with LLM, and store results."""
    # Read file content
    content_bytes = await file.read()
    
    # Extract text from file (handles PDF and plain text)
    raw_text = _extract_text_from_bytes(content_bytes, file.filename or "")
    
    if not raw_text.strip():
        # Empty text after extraction
        statement = BankStatement(
            user_id=user_id,
            filename=file.filename or "unknown",
            status="failed",
            raw_content="",
        )
        db.add(statement)
        await db.commit()
        await db.refresh(statement)
        return _statement_to_out(statement, [])
    
    print(f"Processing statement: {len(raw_text)} chars extracted from {file.filename}")
    
    # Process with LLM
    try:
        result = await process_statement_chunk(raw_text)
    except Exception as e:
        print(f"LLM processing error: {e}")
        result = None
    
    if result is None:
        # Create failed statement record
        statement = BankStatement(
            user_id=user_id,
            filename=file.filename or "unknown",
            status="failed",
            raw_content=raw_text[:10000],
        )
        db.add(statement)
        await db.commit()
        await db.refresh(statement)
        return _statement_to_out(statement, [])
    
    # Extract period
    period = result.get("period", {})
    period_start = None
    period_end = None
    if period.get("start"):
        try:
            period_start = datetime.strptime(period["start"], "%Y-%m-%d").date()
        except:
            pass
    if period.get("end"):
        try:
            period_end = datetime.strptime(period["end"], "%Y-%m-%d").date()
        except:
            pass
    
    # Create statement record
    statement = BankStatement(
        user_id=user_id,
        filename=file.filename or "unknown",
        bank_name=result.get("bank_name", ""),
        period_start=period_start,
        period_end=period_end,
        total_income=result.get("total_income", 0),
        total_expense=result.get("total_expense", 0),
        categories_data=json.dumps(result.get("categories", {}), ensure_ascii=False),
        analysis_text=result.get("analysis", ""),
        raw_content=raw_text[:50000].replace('\x00', ''),  # Store first 50K chars, remove null bytes
        status="completed",
    )
    db.add(statement)
    await db.flush()  # Get statement.id
    
    # Create transactions
    transactions = []
    for tx_data in result.get("transactions", []):
        tx_date = None
        if tx_data.get("date"):
            try:
                tx_date = datetime.strptime(tx_data["date"], "%Y-%m-%d").date()
            except:
                pass
        
        transaction = Transaction(
            statement_id=statement.id,
            user_id=user_id,
            date=tx_date,
            description=tx_data.get("description", ""),
            amount=tx_data.get("amount", 0),
            type=tx_data.get("type", "expense"),
            category=tx_data.get("category", "other"),
        )
        db.add(transaction)
        transactions.append(transaction)
    
    await db.commit()
    await db.refresh(statement)
    
    return _statement_to_out(statement, transactions)


@router.get("/statements/{user_id}", response_model=List[StatementListItem])
async def get_statements(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get list of all statements for a user."""
    result = await db.execute(
        select(BankStatement)
        .where(BankStatement.user_id == user_id)
        .order_by(BankStatement.created_at.desc())
    )
    statements = result.scalars().all()
    
    items = []
    for stmt in statements:
        try:
            categories = json.loads(stmt.categories_data) if stmt.categories_data else {}
            categories_count = len(categories)
        except:
            categories_count = 0
        
        items.append(StatementListItem(
            id=stmt.id,
            filename=stmt.filename,
            bank_name=stmt.bank_name,
            period_start=str(stmt.period_start) if stmt.period_start else None,
            period_end=str(stmt.period_end) if stmt.period_end else None,
            total_income=stmt.total_income,
            total_expense=stmt.total_expense,
            categories_count=categories_count,
            status=stmt.status,
            created_at=str(stmt.created_at) if stmt.created_at else None,
        ))
    
    return items


@router.get("/statements/detail/{statement_id}", response_model=StatementOut)
async def get_statement_detail(statement_id: int, db: AsyncSession = Depends(get_db)):
    """Get full statement details with transactions."""
    result = await db.execute(
        select(BankStatement).where(BankStatement.id == statement_id)
    )
    statement = result.scalar_one_or_none()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Get transactions
    tx_result = await db.execute(
        select(Transaction).where(Transaction.statement_id == statement_id)
    )
    transactions = tx_result.scalars().all()
    
    return _statement_to_out(statement, list(transactions))


@router.delete("/statements/{statement_id}", status_code=204)
async def delete_statement(statement_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a statement and its transactions."""
    result = await db.execute(
        select(BankStatement).where(BankStatement.id == statement_id)
    )
    statement = result.scalar_one_or_none()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    await db.delete(statement)
    await db.commit()


def _statement_to_out(stmt: BankStatement, transactions: list) -> StatementOut:
    """Convert BankStatement model to StatementOut."""
    # Parse categories from JSON string
    try:
        categories_parsed = json.loads(stmt.categories_data) if stmt.categories_data else {}
    except (json.JSONDecodeError, TypeError):
        categories_parsed = {}
    
    return StatementOut(
        id=stmt.id,
        user_id=stmt.user_id,
        filename=stmt.filename,
        bank_name=stmt.bank_name,
        period_start=str(stmt.period_start) if stmt.period_start else None,
        period_end=str(stmt.period_end) if stmt.period_end else None,
        total_income=stmt.total_income,
        total_expense=stmt.total_expense,
        categories_data=stmt.categories_data,
        categories=categories_parsed,
        analysis_text=stmt.analysis_text,
        status=stmt.status,
        created_at=str(stmt.created_at) if stmt.created_at else None,
        transactions=[
            TransactionOut(
                id=t.id,
                date=str(t.date) if t.date else None,
                description=t.description,
                amount=t.amount,
                type=t.type,
                category=t.category,
            )
            for t in transactions
        ],
    )
