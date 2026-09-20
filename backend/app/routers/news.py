import logging
import urllib.parse
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from app.schemas.models import RouteNewsRequest, RouteNewsResponse, CitationItem
from app.services.nemotron_service import route_financial_news
from app.services.edgar_service import (
    fetch_recent_edgar_8k,
    resolve_company_from_query,
    fetch_edgar_2026_dossier
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["News"])


@router.post("/route-news", response_model=RouteNewsResponse)
async def route_news(request: RouteNewsRequest):
    """
    Ingests breaking financial news or press releases.
    Uses NVIDIA Nemotron to classify them into market impact tiers (High, Medium, Low),
    identifies material risk anomalies, and outputs actionable asset allocation guidance.
    If the headline references a company, enriches context with live EDGAR data before routing.
    """
    headline = request.headline.strip()
    if not headline:
        raise HTTPException(status_code=400, detail="News headline cannot be empty.")

    logger.info(f"Incoming /api/route-news for headline: '{headline}'")

    # Attempt to enrich with EDGAR company context and build cited sources
    enriched_content = request.content or ""
    company = None
    try:
        company = resolve_company_from_query(headline)
        if company:
            dossier = fetch_edgar_2026_dossier(company)
            edgar_lines = []
            if dossier.get("filings_2026"):
                edgar_lines.append(f"[EDGAR CONTEXT] {company['title']} ({company['ticker']}) has {len(dossier['filings_2026'])} 2026 SEC filings.")
                edgar_lines.append(f"Latest filing: Form {dossier['filings_2026'][0]['form']} on {dossier['filings_2026'][0]['filing_date']}")
            metrics = dossier.get("xbrl_metrics", {})
            if metrics.get("revenue") and metrics["revenue"].get("value"):
                r_val = metrics["revenue"]["value"]
                r_fmt = f"${r_val / 1e9:.2f}B" if abs(r_val) >= 1e9 else f"${r_val / 1e6:.2f}M"
                edgar_lines.append(f"2026 Reported Revenue: {r_fmt}")
            if edgar_lines:
                enriched_content = "\n".join(edgar_lines) + "\n\n" + enriched_content
    except Exception as e:
        logger.debug(f"EDGAR enrichment skipped: {e}")

    try:
        evaluation = route_financial_news(
            headline=headline,
            content=enriched_content,
            source=request.source or "Wire Service"
        )
    except Exception as e:
        logger.error(f"Error evaluating news: {e}")
        raise HTTPException(status_code=500, detail=f"News routing error: {str(e)}")

    # Construct relevant cited sources
    cited_sources = []
    source_name = request.source or "Wire Service"
    encoded_headline = urllib.parse.quote_plus(headline)

    if company:
        tick = company["ticker"].upper()
        cited_sources.append(CitationItem(
            title=f"SEC EDGAR Material Filings (Form 8-K / 10-Q) - {company['title']} ({tick})",
            uri=f"https://www.sec.gov/edgar/searchedgar/companysearch?q={tick}"
        ))
        cited_sources.append(CitationItem(
            title=f"Bloomberg Terminal Market Intelligence for ${tick}",
            uri=f"https://www.bloomberg.com/quote/{tick}:US"
        ))
        cited_sources.append(CitationItem(
            title=f"Reuters News & Disclosures: {company['title']}",
            uri=f"https://www.reuters.com/markets/companies/{tick}"
        ))
    else:
        cited_sources.append(CitationItem(
            title=f"{source_name}: Original Financial Wire Coverage",
            uri=f"https://www.google.com/search?q={encoded_headline}"
        ))
        cited_sources.append(CitationItem(
            title="SEC EDGAR Company & Macro Filings Search",
            uri="https://www.sec.gov/edgar/searchedgar/companysearch"
        ))
        cited_sources.append(CitationItem(
            title="Bloomberg Markets Breaking Financial News",
            uri="https://www.bloomberg.com/markets"
        ))

    return RouteNewsResponse(
        headline=headline,
        impact_tier=evaluation.get("impact_tier", "Medium"),
        is_material_risk=bool(evaluation.get("is_material_risk", False)),
        sentiment=evaluation.get("sentiment", "Neutral"),
        category=evaluation.get("category", "Market Intelligence"),
        urgency_score=int(evaluation.get("urgency_score", 5)),
        market_impact_analysis=evaluation.get(
            "market_impact_analysis",
            "Potential capital reallocation and sector beta shift following the announcement."
        ),
        recommended_action=evaluation.get(
            "recommended_action",
            "Monitor correlated indices and review trailing risk parameters."
        ),
        cited_sources=cited_sources
    )



@router.get("/edgar-news")
async def get_edgar_news(
    tickers: Optional[str] = Query(None, description="Comma-separated tickers to filter, e.g. NVDA,AAPL,MSFT"),
    limit: int = Query(20, ge=1, le=40, description="Number of filings to return")
):
    """
    Returns live EDGAR 8-K (current report) filings as a structured news feed.
    Optionally filter by comma-separated ticker symbols.
    Backed by SEC EDGAR ATOM RSS with 5-minute cache.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()] if tickers else None
    try:
        items = fetch_recent_edgar_8k(tickers=ticker_list, limit=limit)
        return {"items": items, "count": len(items), "source": "SEC EDGAR 8-K Live Feed"}
    except Exception as e:
        logger.error(f"EDGAR news feed error: {e}")
        raise HTTPException(status_code=500, detail=f"EDGAR news feed error: {str(e)}")
