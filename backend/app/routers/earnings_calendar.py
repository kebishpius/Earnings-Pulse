import logging
from fastapi import APIRouter, HTTPException, Query

from app.services.earnings_calendar_service import (
    build_earnings_calendar,
    DEFAULT_WINDOW_DAYS,
    MAX_WINDOW_DAYS,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Calendar"])


@router.get("/earnings-calendar")
async def earnings_calendar(
    tickers: str = Query("", description="Comma-separated watchlist tickers, e.g. NVDA,AAPL,MSFT"),
    window: int = Query(
        DEFAULT_WINDOW_DAYS,
        ge=7,
        le=MAX_WINDOW_DAYS,
        description="How many days ahead to scan for confirmed report dates",
    ),
):
    """
    The Earnings Radar feed: when each watchlist company reports next, whether
    that date is confirmed or projected, the consensus EPS going in, and how
    the last four quarters landed against consensus.

    Backed by the Nasdaq earnings calendar and surprise history, SEC EDGAR
    8-K item 2.02 filings, and the price feed for the post-report reaction.
    """
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    try:
        return build_earnings_calendar(ticker_list, window_days=window)
    except Exception as e:
        logger.error(f"Earnings calendar error: {e}")
        raise HTTPException(status_code=502, detail=f"Earnings calendar error: {str(e)}")
