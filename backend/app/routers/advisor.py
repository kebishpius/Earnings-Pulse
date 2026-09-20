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
    history: Optional[List[Dict[str, Any]]] = None


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
    history = request.history or []
    logger.info(f"/api/ai-advisor: model={model_choice}, msg='{request.message[:60]}...', history_len={len(history)}")

    try:
        if model_choice == "claude":
            from app.services.claude_service import advise_with_claude
            result = advise_with_claude(request.message, portfolio_dict, history=history)

        elif model_choice == "nemotron":
            from app.services.nemotron_service import advise_with_nemotron
            result = advise_with_nemotron(request.message, portfolio_dict, history=history)

        else:  # default: gemini
            from app.services.gemini_service import advise_with_gemini
            result = advise_with_gemini(request.message, portfolio_dict, history=history)

        return AdvisorResponse(
            text=result.get("text", "No response generated."),
            model=result.get("model", model_choice.title()),
            provider=result.get("provider", "AI"),
        )

    except Exception as e:
        logger.error(f"AI advisor error for model={model_choice}: {e}, falling back to dynamic advisor engine.")
        from app.services.advisor_engine import analyze_portfolio_and_generate_advice
        result = analyze_portfolio_and_generate_advice(
            user_message=request.message,
            model_id=model_choice,
            portfolio_context=portfolio_dict,
            history=history
        )
        return AdvisorResponse(
            text=result.get("text", "No response generated."),
            model=result.get("model", model_choice.title()),
            provider=result.get("provider", "AI"),
        )



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

        def clean_money(raw):
            """Parse "$14,220.00", "(1,234.56)" and "--" the way brokers write them."""
            s = str(raw or "").strip()
            if not s or s in {"--", "-"} or s.lower() == "n/a":
                return None
            negative = s.startswith("(") and s.endswith(")")
            s = re.sub(r"[^\d.,-]", "", s.strip("()"))
            if not s:
                return None
            # "1.234,56" (EU) vs "1,234.56" (US): the later separator is the decimal point.
            last_comma, last_dot = s.rfind(","), s.rfind(".")
            if last_comma > -1 and last_dot > -1:
                s = s.replace(".", "").replace(",", ".") if last_comma > last_dot else s.replace(",", "")
            elif last_comma > -1:
                s = s.replace(",", ".") if re.search(r",\d{2}$", s) else s.replace(",", "")
            try:
                val = float(s)
            except (ValueError, TypeError):
                return None
            return -abs(val) if negative else val

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

        # Brokers disagree on capitalisation ("Current Value" vs "current value"),
        # so every column lookup goes through a case-insensitive map rather than
        # an exact row.get(), which silently returned None for half of them.
        header_map = {f.lower(): f for f in fieldnames}

        def pick(row, *names):
            for name in names:
                key = header_map.get(name.lower())
                if key is not None:
                    value = row.get(key)
                    if value not in (None, ""):
                        return value
            return None

        is_stock_holdings = any(k in fieldnames_lower for k in ["symbol", "ticker", "holding", "position", "shares", "quantity", "market value", "current value"])

        holdings = []
        transactions = []

        if is_stock_holdings:
            # Parse as stock positions (Schwab, Fidelity, Robinhood, Vanguard)
            for i, row in enumerate(reader):
                raw_sym = pick(row, "Symbol", "Ticker", "Ticker Symbol", "Stock", "Asset")
                sym = str(raw_sym or "").strip().upper()

                # Summary rows are not positions and would double the total.
                if re.fullmatch(r"(ACCOUNT\s+)?(GRAND\s+)?TOTALS?|SUBTOTAL|SUM", sym or ""):
                    continue
                if not sym or sym in {"--", ""}:
                    continue
                # Schwab writes its sweep balance as "Cash & Cash Investments" in
                # the symbol column, which is a real position but not a ticker.
                if "CASH" in sym and not re.fullmatch(r"[A-Z0-9.\-]{1,6}", sym):
                    sym = "USD"
                else:
                    sym = re.sub(r"[^A-Z0-9.\-]", "", sym)[:12]
                if not sym:
                    continue

                # Asset Name / Description
                desc = pick(row, "Description", "Name", "Security Description", "Security Name", "Investment Name")
                if not desc or str(desc).strip() == "--":
                    desc = sym

                # Market Value, or compute it from Quantity x Price
                val = clean_money(pick(row, "Current Value", "Market Value", "Value", "Total Value", "Total"))
                if not val:
                    qty = clean_money(pick(row, "Quantity", "Shares", "Qty", "Units"))
                    prc = clean_money(pick(row, "Last Price", "Price", "Current Price", "Market Price"))
                    val = qty * prc if qty is not None and prc is not None else None
                val = abs(val) if val else 0.0
                if val == 0.0:
                    continue

                # Determine asset type
                name_lower = str(desc).lower()
                if sym in ["USD", "CASH", "SPAXX", "FDRXX", "SWVXX", "VMFXX", "FZFXX"] or "money market" in name_lower or "cash" in name_lower:
                    atype = "Cash"
                elif sym in ["BTC", "ETH", "SOL", "DOGE", "ADA", "XRP"]:
                    atype = "Crypto"
                elif any(sym.endswith(sfx) for sfx in ["XX", "ETF"]) or sym in ["SPY", "QQQ", "VOO", "VTI", "IWM"] or " etf" in name_lower:
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
            rows = list(reader)

            # Statements sign outflows negative and income positive. When both
            # appear only the outflows are spending; taking abs() of everything
            # turned a paycheck into a flagged anomaly.
            raw_amounts = [clean_money(pick(r, "Amount", "Transaction Amount", "Debit", "Withdrawal", "Credit", "Deposit")) for r in rows]
            has_negatives = any(a is not None and a < 0 for a in raw_amounts)

            for i, (row, amount) in enumerate(zip(rows, raw_amounts)):
                if amount is None or amount == 0:
                    continue
                if has_negatives and amount > 0:
                    continue  # a credit, not spending

                desc = pick(row, "Description", "Merchant", "Name", "Payee", "Memo", "Details") or f"Transaction {i+1}"
                date = pick(row, "Date", "Transaction Date", "Posted Date", "Post Date", "Posting Date") or ""
                # The CSV's own category drives subscription-leak detection
                # downstream, so it has to survive the round trip.
                category = pick(row, "Category", "Classification", "Type", "Transaction Type") or "Other"

                transactions.append(ParsedTransaction(
                    date=str(date),
                    description=str(desc),
                    amount=abs(amount),
                    category=str(category)
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

