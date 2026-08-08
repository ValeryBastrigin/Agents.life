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
from src.models import FinancialObligation, BankStatement, Transaction, User
from src.agents.statement_agent import process_statement_chunk
from src.billing.calculator import calculate_cost
from src.billing.dependency import check_billing_limit

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
            if not _is_pdf(content_bytes) or text.count('\n') > 10:
                return text
            return text
        except UnicodeDecodeError:
            continue
    
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


@router.get("/obligations/notifications/{user_id}")
async def check_obligation_notifications(user_id: int, db: AsyncSession = Depends(get_db)):
    """Check if today is the day for any financial obligations or bank statement renewal and return push notifications."""
    today = date.today()
    current_day = today.day
    
    result = await db.execute(
        select(FinancialObligation).where(FinancialObligation.user_id == user_id)
    )
    obligations = result.scalars().all()
    
    notifications = []
    
    for o in obligations:
        if o.date == current_day:
            is_expense = o.type == 'expense'
            action_name = "списание" if is_expense else "поступление"
            title = f"Сегодня {action_name}: {o.title}"
            message = f"По расписанию на сегодня ({o.date}-е число) запланировано {action_name} '{o.title}' на сумму {o.amount:,.0f} ₽."
            notifications.append({
                "id": f"obligation-{o.id}-{today.isoformat()}",
                "agent": "accountant",
                "title": title,
                "message": message,
                "time": "Только что",
                "type": "push"
            })
            
    stmt_result = await db.execute(
        select(BankStatement)
        .where(BankStatement.user_id == user_id)
        .order_by(BankStatement.created_at.desc())
        .limit(1)
    )
    latest_stmt = stmt_result.scalar_one_or_none()
    if latest_stmt and latest_stmt.created_at:
        stmt_date = latest_stmt.created_at.date() if hasattr(latest_stmt.created_at, 'date') else latest_stmt.created_at
        month_diff = (today.year - stmt_date.year) * 12 + (today.month - stmt_date.month)
        days_diff = (today - stmt_date).days
        if month_diff >= 1 and days_diff >= 30:
            notifications.append({
                "id": f"statement-monthly-{latest_stmt.id}-{today.isoformat()}",
                "agent": "accountant",
                "title": "Время обновить банковскую выписку",
                "message": "Прошел ровно месяц с момента загрузки последней выписки. Загрузите свежую выписку, чтобы финансовый ассистент обновил анализ расходов и бюджета.",
                "time": "Только что",
                "type": "push"
            })
            
    return notifications


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
    result_user = await db.execute(select(User).where(User.id == user_id))
    user = result_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await check_billing_limit(user, estimated_cost=5, db=db)
    
    content_bytes = await file.read()
    raw_text = _extract_text_from_bytes(content_bytes, file.filename or "")
    
    if not raw_text.strip():
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
    
    tokens_in = len(raw_text) // 4
    tokens_out = 500
    try:
        result, tokens_in, tokens_out = await process_statement_chunk(raw_text)
    except Exception as e:
        print(f"LLM processing error: {e}")
        result = None
    
    if user:
        credits_cost = calculate_cost("google/gemini-2.5-flash-lite", input_tokens=tokens_in, output_tokens=tokens_out)
        credits_cost = max(credits_cost, 1)
        
        old_used = user.credits_used or 0
        old_balance = user.token_balance or 0
        
        user.credits_used = old_used + credits_cost
        user.token_balance = max(old_balance - credits_cost, 0)
        user.last_credit_reset = date.today()
        db.add(user)
        await db.commit()
        
        print(f"[BILLING ACCOUNTANT STATEMENT] User {user.id} | Document Analysis | "
              f"Tokens In: {tokens_in}, Out: {tokens_out} | "
              f"Calculated Cost: {credits_cost} credits | "
              f"credits_used: {old_used} -> {user.credits_used} | "
              f"token_balance: {old_balance} -> {user.token_balance}")

    if result is None:
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
        raw_content=raw_text[:50000].replace('\x00', ''),
        status="completed",
    )
    db.add(statement)
    await db.flush()
    
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
    result = await db.execute(
        select(BankStatement).where(BankStatement.id == statement_id)
    )
    statement = result.scalar_one_or_none()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    tx_result = await db.execute(
        select(Transaction).where(Transaction.statement_id == statement_id)
    )
    transactions = tx_result.scalars().all()
    
    return _statement_to_out(statement, list(transactions))


@router.delete("/statements/{statement_id}", status_code=204)
async def delete_statement(statement_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BankStatement).where(BankStatement.id == statement_id)
    )
    statement = result.scalar_one_or_none()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    await db.delete(statement)
    await db.commit()


def _statement_to_out(stmt: BankStatement, transactions: list) -> StatementOut:
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


# ===== Portfolio Analysis =====

class PortfolioAnalysisOut(BaseModel):
    id: int
    user_id: int
    overall_score: int
    strengths: list
    weaknesses: list
    recommendations: list
    asset_allocation: dict
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True

    @classmethod
    def from_orm(cls, model):
        def _parse(val, expected_type=list):
            if isinstance(val, str):
                try:
                    parsed = json.loads(val)
                    return parsed if isinstance(parsed, expected_type) else (expected_type([parsed]) if expected_type is list else expected_type())
                except (json.JSONDecodeError, TypeError):
                    return [val] if expected_type is list else {}
            if val is None:
                return [] if expected_type is list else {}
            return val if isinstance(val, expected_type) else (expected_type([val]) if expected_type is list else {})
        return cls(
            id=model.id,
            user_id=model.user_id,
            overall_score=model.overall_score,
            strengths=_parse(model.strengths, list),
            weaknesses=_parse(model.weaknesses, list),
            recommendations=_parse(model.recommendations, list),
            asset_allocation=_parse(model.asset_allocation, dict),
            created_at=str(model.created_at) if model.created_at else None,
        )


@router.post("/portfolio/analyze/{user_id}", response_model=PortfolioAnalysisOut)
async def analyze_portfolio(
    user_id: int,
    screenshots: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload screenshots of investment portfolio and analyze with LLM."""
    from src.models import PortfolioAnalysis
    from src.agents.accountant_agent import analyze_portfolio

    portfolio_user_result = await db.execute(select(User).where(User.id == user_id))
    portfolio_user = portfolio_user_result.scalar_one_or_none()
    if not portfolio_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await check_billing_limit(portfolio_user, estimated_cost=5, db=db)

    if not screenshots:
        raise HTTPException(status_code=400, detail="No files uploaded")

    import base64
    image_urls = []
    for file in screenshots:
        content = await file.read()
        ext = os.path.splitext(file.filename or ".png")[1].lower().replace(".", "")
        if not ext:
            ext = "png"
        b64 = base64.b64encode(content).decode("utf-8")
        data_uri = f"data:image/{ext};base64,{b64}"
        image_urls.append(data_uri)

    try:
        result, input_tokens, output_tokens = await analyze_portfolio(image_urls)
    except Exception as e:
        print(f"Portfolio LLM error: {e}")
        result = {}

    if portfolio_user:
        credits_cost = calculate_cost("google/gemini-2.5-flash-lite", input_tokens=input_tokens, output_tokens=output_tokens)
        credits_cost = max(credits_cost, 1)
        
        old_used = portfolio_user.credits_used or 0
        old_balance = portfolio_user.token_balance or 0
        
        portfolio_user.credits_used = old_used + credits_cost
        portfolio_user.token_balance = max(old_balance - credits_cost, 0)
        portfolio_user.last_credit_reset = date.today()
        db.add(portfolio_user)
        await db.commit()
        
        print(f"[BILLING ACCOUNTANT PORTFOLIO] User {portfolio_user.id} | Images: {len(screenshots)} | "
              f"Tokens In: {input_tokens}, Out: {output_tokens} | "
              f"Calculated Cost: {credits_cost} credits | "
              f"credits_used: {old_used} -> {portfolio_user.credits_used} | "
              f"token_balance: {old_balance} -> {portfolio_user.token_balance}")

    portfolio = PortfolioAnalysis(
        user_id=user_id,
        overall_score=result.get("overall_score", 5),
        strengths=json.dumps(result.get("strengths", []), ensure_ascii=False),
        weaknesses=json.dumps(result.get("weaknesses", []), ensure_ascii=False),
        recommendations=json.dumps(result.get("recommendations", []), ensure_ascii=False),
        asset_allocation=json.dumps(result.get("asset_allocation", {}), ensure_ascii=False),
    )
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)

    return PortfolioAnalysisOut.from_orm(portfolio)


@router.get("/portfolio/analyses/{user_id}", response_model=List[PortfolioAnalysisOut])
async def get_portfolio_analyses(user_id: int, db: AsyncSession = Depends(get_db)):
    from src.models import PortfolioAnalysis

    result = await db.execute(
        select(PortfolioAnalysis)
        .where(PortfolioAnalysis.user_id == user_id)
        .order_by(PortfolioAnalysis.created_at.desc())
        .limit(10)
    )
    analyses = result.scalars().all()

    return [PortfolioAnalysisOut.from_orm(a) for a in analyses]


@router.get("/portfolio/analyses/latest/{user_id}", response_model=Optional[PortfolioAnalysisOut])
async def get_latest_portfolio_analysis(user_id: int, db: AsyncSession = Depends(get_db)):
    from src.models import PortfolioAnalysis

    result = await db.execute(
        select(PortfolioAnalysis)
        .where(PortfolioAnalysis.user_id == user_id)
        .order_by(PortfolioAnalysis.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        return None

    return PortfolioAnalysisOut.from_orm(analysis)


@router.delete("/portfolio/analyses/{analysis_id}", status_code=204)
async def delete_portfolio_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    from src.models import PortfolioAnalysis

    result = await db.execute(
        select(PortfolioAnalysis).where(PortfolioAnalysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Portfolio analysis not found")
    await db.delete(analysis)
    await db.commit()
