import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["AI Advisor"])


# ─── Request / Response Models ────────────────────────────────────────────────

class HoldingItem(BaseModel):
    symbol: str
    asset_name: str = ""
    asset_type: str = "Equity"
    allocation_pct: float = 0.0
    current_value: float = 0.0


class TransactionItem(BaseModel):
    id: str = ""
    date: str = ""
    description: str = ""
    amount: float = 0.0
    category: str = "Other"


class AuditResult(BaseModel):
    overall_risk_score: int = 50
    risk_level: str = "Moderate"


class PortfolioContext(BaseModel):
    holdings: List[HoldingItem] = []
    transactions: List[TransactionItem] = []
    last_audit: Optional[AuditResult] = None


class AdvisorRequest(BaseModel):
    message: str
    model: str = "gemini"   # "gemini" | "nemotron" | "claude"
    portfolio_context: Optional[PortfolioContext] = None


class AdvisorResponse(BaseModel):
    text: str
    model: str
    provider: str
    error: Optional[str] = None


class ParseDataRequest(BaseModel):
    raw_text: str                     # Raw CSV or JSON text from the user
    format: str = "csv"               # "csv" | "json"


class ParsedTransaction(BaseModel):
    date: str = ""
    description: str
    amount: float
    category: str = "Other"


class ParseDataResponse(BaseModel):
    transactions: List[ParsedTransaction]
    count: int
    parse_method: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/ai-advisor", response_model=AdvisorResponse)
async def ai_advisor(request: AdvisorRequest):
    """
    Routes a financial advisory question to the selected AI model
    (Gemini, Nemotron, or Claude) with optional personal portfolio context.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    portfolio_dict = None
    if request.portfolio_context:
        portfolio_dict = {
            "holdings": [h.model_dump() for h in request.portfolio_context.holdings],
            "transactions": [t.model_dump() for t in request.portfolio_context.transactions],
            "last_audit": request.portfolio_context.last_audit.model_dump() if request.portfolio_context.last_audit else None
        }

    model_choice = request.model.lower().strip()
    logger.info(f"/api/ai-advisor: model={model_choice}, msg='{request.message[:60]}...'")

    try:
        if model_choice == "claude":
            from app.services.claude_service import advise_with_claude
            result = advise_with_claude(request.message, portfolio_dict)

        elif model_choice == "nemotron":
            from app.services.nemotron_service import advise_with_nemotron
            result = advise_with_nemotron(request.message, portfolio_dict)

        else:  # default: gemini
            from app.services.gemini_service import advise_with_gemini
            result = advise_with_gemini(request.message, portfolio_dict)

        return AdvisorResponse(
            text=result.get("text", "No response generated."),
            model=result.get("model", model_choice.title()),
            provider=result.get("provider", "AI"),
        )

    except Exception as e:
        logger.error(f"AI advisor error for model={model_choice}: {e}")
        raise HTTPException(status_code=500, detail=f"Advisor error: {str(e)}")


@router.post("/upload-data/parse", response_model=ParseDataResponse)
async def parse_uploaded_data(request: ParseDataRequest):
    """
    Accepts raw CSV or JSON text from a bank statement or broker export
    and uses Gemini to parse it into structured EarningsPulse transactions.
    Falls back to basic client-side parsing if Gemini is unavailable.
    """
    if not request.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text cannot be empty.")

    logger.info(f"/api/upload-data/parse: format={request.format}, chars={len(request.raw_text)}")

    # Try Gemini AI parsing first
    try:
        from app.services.gemini_service import parse_csv_with_gemini
        parsed = parse_csv_with_gemini(request.raw_text)

        transactions = []
        for i, item in enumerate(parsed):
            if isinstance(item, dict):
                transactions.append(ParsedTransaction(
                    date=str(item.get("date", "")),
                    description=str(item.get("description", f"Transaction {i+1}")),
                    amount=abs(float(item.get("amount", 0))),
                    category=str(item.get("category", "Other"))
                ))

        return ParseDataResponse(
            transactions=transactions,
            count=len(transactions),
            parse_method="Gemini AI Parser"
        )

    except Exception as e:
        logger.warning(f"Gemini CSV parse failed, attempting basic parse: {e}")

    # Fallback: basic CSV parsing
    try:
        import csv, io, re
        transactions = []
        reader = csv.DictReader(io.StringIO(request.raw_text))
        for i, row in enumerate(reader):
            # Try to find common CSV column patterns
            desc = row.get("Description") or row.get("Merchant") or row.get("Name") or row.get("Payee") or f"Transaction {i+1}"
            amount_str = row.get("Amount") or row.get("Debit") or row.get("Withdrawal") or "0"
            amount_str = re.sub(r'[^\d\.-]', '', str(amount_str))
            try:
                amount = abs(float(amount_str))
            except (ValueError, TypeError):
                amount = 0.0
            date = row.get("Date") or row.get("Transaction Date") or row.get("Posted Date") or ""
            transactions.append(ParsedTransaction(
                date=date,
                description=str(desc),
                amount=amount,
                category="Other"
            ))

        return ParseDataResponse(
            transactions=transactions,
            count=len(transactions),
            parse_method="Basic CSV Parser (Fallback)"
        )
    except Exception as e2:
        logger.error(f"Basic CSV parse also failed: {e2}")
        raise HTTPException(status_code=500, detail=f"Failed to parse uploaded data: {str(e2)}")
