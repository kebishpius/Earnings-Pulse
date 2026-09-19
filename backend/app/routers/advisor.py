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


class ParsedHolding(BaseModel):
    symbol: str
    asset_name: str = ""
    asset_type: str = "Equity"
    current_value: float = 0.0
    allocation_pct: float = 0.0


class ParsedTransaction(BaseModel):
    date: str = ""
    description: str
    amount: float
    category: str = "Other"


class ParseDataResponse(BaseModel):
    data_type: str = "transactions"   # "holdings" | "transactions" | "mixed"
    holdings: List[ParsedHolding] = []
    transactions: List[ParsedTransaction] = []
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
    Accepts raw CSV or JSON text from a stock broker (Schwab, Fidelity, Robinhood, Vanguard)
    or bank statement and parses it into structured holdings and/or transactions.
    Falls back to smart deterministic parsing if Gemini is unavailable.
    """
    if not request.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text cannot be empty.")

    logger.info(f"/api/upload-data/parse: format={request.format}, chars={len(request.raw_text)}")

    # 1. Try Gemini AI parsing first
    try:
        from app.services.gemini_service import parse_csv_with_gemini
        parsed = parse_csv_with_gemini(request.raw_text)

        raw_holdings = parsed.get("holdings", []) if isinstance(parsed, dict) else []
        raw_txs = parsed.get("transactions", []) if isinstance(parsed, dict) else (parsed if isinstance(parsed, list) else [])

        holdings = []
        transactions = []

        for h in raw_holdings:
            if isinstance(h, dict) and h.get("symbol"):
                val = abs(float(h.get("current_value", 0)))
                holdings.append(ParsedHolding(
                    symbol=str(h.get("symbol", "")).upper().strip(),
                    asset_name=str(h.get("asset_name", h.get("symbol", ""))),
                    asset_type=str(h.get("asset_type", "Equity")),
                    current_value=val,
                    allocation_pct=float(h.get("allocation_pct", 0.0))
                ))

        for i, t in enumerate(raw_txs):
            if isinstance(t, dict):
                transactions.append(ParsedTransaction(
                    date=str(t.get("date", "")),
                    description=str(t.get("description", f"Transaction {i+1}")),
                    amount=abs(float(t.get("amount", 0))),
                    category=str(t.get("category", "Other"))
                ))

        # If holdings were parsed without allocation percentages, compute them
        if holdings:
            total_val = sum(h.current_value for h in holdings)
            if total_val > 0:
                for h in holdings:
                    if h.allocation_pct <= 0:
                        h.allocation_pct = round((h.current_value / total_val) * 100, 1)

        if holdings and transactions:
            data_type = "mixed"
            total_count = len(holdings) + len(transactions)
        elif holdings:
            data_type = "holdings"
            total_count = len(holdings)
        else:
            data_type = "transactions"
            total_count = len(transactions)

        if total_count > 0:
            return ParseDataResponse(
                data_type=data_type,
                holdings=holdings,
                transactions=transactions,
                count=total_count,
                parse_method="Gemini AI Parser"
            )

    except Exception as e:
        logger.warning(f"Gemini CSV parse failed, attempting smart deterministic parse: {e}")

    # 2. Smart Deterministic Broker & Bank CSV Parsing Fallback
    try:
        import csv, io, re

        lines = [line for line in request.raw_text.strip().splitlines() if line.strip()]
        # Skip potential broker metadata headers until table header row
        header_idx = 0
        for idx, line in enumerate(lines[:10]):
            line_lower = line.lower()
            if any(k in line_lower for k in ["symbol", "ticker", "description", "quantity", "shares", "amount", "date"]):
                header_idx = idx
                break

        csv_content = "\n".join(lines[header_idx:])
        reader = csv.DictReader(io.StringIO(csv_content))
        
        # Check fieldnames to determine if this is a Stock Holdings CSV or a Bank Ledger CSV
        fieldnames = [f.strip() for f in (reader.fieldnames or [])]
        fieldnames_lower = [f.lower() for f in fieldnames]

        is_stock_holdings = any(k in fieldnames_lower for k in ["symbol", "ticker", "holding", "position", "shares", "quantity", "market value", "current value"])

        holdings = []
        transactions = []

        if is_stock_holdings:
            # Parse as stock positions (Schwab, Fidelity, Robinhood, Vanguard)
            for i, row in enumerate(reader):
                # Symbol lookup
                sym = None
                for col in ["Symbol", "Ticker", "Stock", "Asset", "symbol", "ticker"]:
                    if col in row and row[col]:
                        sym = str(row[col]).strip().upper()
                        break
                if not sym or sym.lower() in ["total", "account total", "cash", "--", ""]:
                    # Check for cash balance line
                    if sym and "cash" in sym.lower():
                        sym = "USD"
                    else:
                        continue

                # Asset Name / Description
                desc = row.get("Description") or row.get("Name") or row.get("Security Description") or sym

                # Market Value or compute from Quantity * Price
                val_str = row.get("Current Value") or row.get("Market Value") or row.get("Value") or row.get("Total") or "0"
                val_str = re.sub(r'[^\d\.-]', '', str(val_str))
                try:
                    val = abs(float(val_str))
                except (ValueError, TypeError):
                    val = 0.0

                if val == 0.0:
                    # Try quantity * price
                    qty_str = re.sub(r'[^\d\.-]', '', str(row.get("Quantity") or row.get("Shares") or "0"))
                    prc_str = re.sub(r'[^\d\.-]', '', str(row.get("Price") or row.get("Last Price") or row.get("Cost Per Share") or "0"))
                    try:
                        val = abs(float(qty_str) * float(prc_str))
                    except (ValueError, TypeError):
                        val = 0.0

                # Determine asset type
                sym_upper = sym.upper()
                if sym_upper in ["USD", "CASH", "SPAXX", "FDRXX", "SWVXX"]:
                    atype = "Cash"
                elif sym_upper in ["BTC", "ETH", "SOL", "DOGE"]:
                    atype = "Crypto"
                elif any(sym_upper.endswith(sfx) for sfx in ["XX", "ETF"]) or sym_upper in ["SPY", "QQQ", "VOO", "VTI", "IWM"]:
                    atype = "ETF"
                else:
                    atype = "Equity"

                holdings.append(ParsedHolding(
                    symbol=sym,
                    asset_name=str(desc),
                    asset_type=atype,
                    current_value=val,
                    allocation_pct=0.0
                ))

            # Compute allocation percentages
            total_val = sum(h.current_value for h in holdings)
            if total_val > 0:
                for h in holdings:
                    h.allocation_pct = round((h.current_value / total_val) * 100, 1)

            return ParseDataResponse(
                data_type="holdings",
                holdings=holdings,
                transactions=[],
                count=len(holdings),
                parse_method="Smart Broker CSV Parser (Fallback)"
            )

        else:
            # Parse as bank / transaction ledger
            for i, row in enumerate(reader):
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
                data_type="transactions",
                holdings=[],
                transactions=transactions,
                count=len(transactions),
                parse_method="Basic Bank CSV Parser (Fallback)"
            )

    except Exception as e2:
        logger.error(f"Fallback CSV parse failed: {e2}")
        raise HTTPException(status_code=500, detail=f"Failed to parse uploaded data: {str(e2)}")

