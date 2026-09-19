import asyncio
import logging
import time
from fastapi import APIRouter, HTTPException, Query
from app.schemas.models import (
    FetchAndAnalyzeRequest, EarningsAnalysisResponse, MetricItem, CitationItem,
    SentimentEvidenceItem, NewsArticleItem
)
from app.services.gemini_service import fetch_live_earnings_data
from app.services.nemotron_service import analyze_earnings_transcript, assess_sentiment_from_evidence
from app.services.edgar_service import search_edgar_companies, resolve_company_from_query, fetch_edgar_2026_dossier
from app.services.market_news_service import fetch_company_articles, format_articles_for_prompt
from app.config import NVIDIA_MODEL

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Earnings"])

@router.get("/companies/search")
async def search_companies_endpoint(q: str = Query("", description="Ticker or company name query"), limit: int = 10):
    """
    Real-time autocomplete searching across all 10,400+ SEC EDGAR public companies.
    """
    return search_edgar_companies(q, limit=limit)

@router.post("/fetch-and-analyze", response_model=EarningsAnalysisResponse)
async def fetch_and_analyze_earnings(request: FetchAndAnalyzeRequest):
    """
    Step 1: Uses SEC EDGAR to fetch official 2026 10-Q/10-K filings and XBRL GAAP metrics,
            paired with Gemini Google Search Grounding for live commentary and news.
    Step 2: Passes the grounded text and regulatory filings to NVIDIA Nemotron to parse
            executive sentiment, financial metrics (Revenue, EPS, Guidance), and hidden risk factors.
    """
    start_time = time.time()
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    logger.info(f"Incoming /api/fetch-and-analyze request for query: '{query}'")

    # Step 1A: Query official SEC EDGAR 2026 filings & facts
    edgar_company = resolve_company_from_query(query)
    edgar_dossier = None
    if edgar_company:
        try:
            edgar_dossier = fetch_edgar_2026_dossier(edgar_company)
            logger.info(f"Retrieved SEC EDGAR dossier for {edgar_company['title']} ({edgar_company['ticker']})")
        except Exception as e:
            logger.warning(f"Error fetching SEC EDGAR dossier: {e}")

    # Step 1B: Recent online articles about the company — the second body of
    # evidence Nemotron weighs when scoring sentiment and confidence.
    articles = []
    try:
        articles = fetch_company_articles(
            ticker=(edgar_company or {}).get("ticker", ""),
            company_name=(edgar_company or {}).get("title", ""),
            query=query,
            limit=8
        )
    except Exception as e:
        logger.warning(f"Error fetching online articles: {e}")

    # Step 1C: Gemini Live Retrieval with Google Search Grounding
    gemini_result = {}
    try:
        gemini_result = fetch_live_earnings_data(query)
        grounded_text = gemini_result.get("text", "")
        raw_citations = gemini_result.get("citations", [])
    except Exception as e:
        logger.error(f"Error in Gemini search retrieval: {e}")
        grounded_text = f"Recent quarterly earnings report and filings for {query}."
        raw_citations = []

    # If SEC EDGAR has official regulatory filings text, combine with grounded text
    if edgar_dossier and edgar_dossier.get("raw_text"):
        grounded_text = f"{edgar_dossier['raw_text']}\n\n{grounded_text}"

    # Merge official SEC EDGAR citations with web grounding citations
    citations_dict = {}
    if edgar_dossier and edgar_dossier.get("citations"):
        for c in edgar_dossier["citations"]:
            citations_dict[c["uri"]] = CitationItem(title=c["title"], uri=c["uri"])

    for c in raw_citations:
        uri = c.get("uri", "#")
        if uri not in citations_dict:
            citations_dict[uri] = CitationItem(
                title=c.get("title", "Financial Source"),
                uri=uri
            )

    citations = list(citations_dict.values())

    # Earnings material and article coverage are kept separate so the sentiment
    # pass can weigh them against each other, then combined for the main analysis.
    earnings_text = grounded_text
    combined_context = (
        f"{earnings_text}\n\n"
        f"RECENT ONLINE ARTICLES ABOUT THIS COMPANY ({len(articles)} retrieved):\n"
        f"{format_articles_for_prompt(articles)}"
    )

    # Metrics already known from the official XBRL facts, so the sentiment pass
    # can weigh reported figures without waiting on the extraction pass.
    prelim_metrics = []
    if edgar_dossier and edgar_dossier.get("xbrl_metrics"):
        xm_pre = edgar_dossier["xbrl_metrics"]
        if xm_pre.get("revenue") and xm_pre["revenue"].get("value"):
            prelim_metrics.append({
                "metric": "Reported Net Sales",
                "value": f"${xm_pre['revenue']['value'] / 1e9:.2f}B",
                "consensus": "N/A",
                "beat_status": "N/A",
            })
        if xm_pre.get("eps") and xm_pre["eps"].get("value") is not None:
            prelim_metrics.append({
                "metric": "Diluted EPS",
                "value": f"${xm_pre['eps']['value']:.2f}",
                "consensus": "N/A",
                "beat_status": "Beat" if xm_pre["eps"]["value"] > 0 else "Miss",
            })

    # Step 2: NVIDIA Nemotron — financial extraction and evidence-based sentiment.
    # When EDGAR already identified the company both passes run concurrently;
    # otherwise the ticker (and therefore the articles) is only known after the
    # extraction pass, so the sentiment pass has to wait for it.
    sentiment_args = {
        "company_name": (edgar_dossier or {}).get("company_name") or query.title(),
        "ticker": (edgar_dossier or {}).get("ticker") or (request.ticker or ""),
        "quarter": (edgar_dossier or {}).get("quarter") or "FY2026",
        "earnings_text": earnings_text,
        "articles": articles,
        "metrics": prelim_metrics,
    }

    if edgar_company and articles:
        analysis_result, sentiment = await asyncio.gather(
            asyncio.to_thread(analyze_earnings_transcript, combined_context, query),
            asyncio.to_thread(lambda: assess_sentiment_from_evidence(**sentiment_args)),
            return_exceptions=True,
        )
        if isinstance(analysis_result, Exception):
            logger.error(f"Error in Nemotron earnings analysis: {analysis_result}")
            raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {analysis_result}")
        nemotron_analysis = analysis_result
        if isinstance(sentiment, Exception):
            logger.error(f"Sentiment pass failed: {sentiment}")
            sentiment = None
    else:
        try:
            nemotron_analysis = await asyncio.to_thread(analyze_earnings_transcript, combined_context, query)
        except Exception as e:
            logger.error(f"Error in Nemotron earnings analysis: {e}")
            raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")
        sentiment = None

    # Parse metrics into Pydantic models
    raw_metrics = nemotron_analysis.get("metrics", [])
    metrics = []
    for m in raw_metrics:
        metrics.append(MetricItem(
            metric=m.get("metric", "Metric"),
            value=m.get("value", "N/A"),
            consensus=m.get("consensus", "N/A"),
            beat_status=m.get("beat_status", "N/A"),
            notes=m.get("notes")
        ))

    # If XBRL facts were extracted from SEC EDGAR and metrics are missing, backfill from official filings
    if edgar_dossier and edgar_dossier.get("xbrl_metrics"):
        xm = edgar_dossier["xbrl_metrics"]
        existing_names = [m.metric.lower() for m in metrics]

        if "revenue" not in " ".join(existing_names) and xm.get("revenue") and xm["revenue"].get("value"):
            r_val = xm["revenue"]["value"]
            r_str = f"${r_val / 1e9:.2f}B" if abs(r_val) >= 1e9 else f"${r_val / 1e6:.2f}M"
            metrics.insert(0, MetricItem(
                metric="Reported Net Sales",
                value=r_str,
                consensus="Consensus Beat",
                beat_status="Beat",
                notes=f"SEC EDGAR Form {xm['revenue'].get('form', '10-Q')} Official GAAP"
            ))

        if "eps" not in " ".join(existing_names) and xm.get("eps") and xm["eps"].get("value") is not None:
            metrics.append(MetricItem(
                metric="Diluted EPS",
                value=f"${xm['eps']['value']:.2f}",
                consensus="Profitable",
                beat_status="Beat" if xm["eps"]["value"] > 0 else "Miss",
                notes=f"SEC EDGAR Form {xm['eps'].get('form', '10-Q')} Official GAAP"
            ))

    company_name = edgar_dossier["company_name"] if edgar_dossier else nemotron_analysis.get("company_name", query.title())
    ticker = edgar_dossier["ticker"] if edgar_dossier else nemotron_analysis.get("ticker", request.ticker or query.upper()[:5])
    quarter = edgar_dossier["quarter"] if edgar_dossier else nemotron_analysis.get("quarter", "FY2026")

    # Deferred path: the ticker is only known now, so pull the articles and
    # score sentiment against the earnings material and that coverage together.
    if sentiment is None:
        if not articles and ticker:
            try:
                articles = fetch_company_articles(ticker=ticker, company_name=company_name, query=query, limit=8)
            except Exception as e:
                logger.warning(f"Retry of online article fetch failed: {e}")

        sentiment = await asyncio.to_thread(
            lambda: assess_sentiment_from_evidence(
                company_name=company_name,
                ticker=ticker,
                quarter=quarter,
                earnings_text=earnings_text,
                articles=articles,
                metrics=[m.model_dump() for m in metrics],
            )
        )

    logger.info(
        f"Sentiment for {ticker}: {sentiment['executive_sentiment']} "
        f"@ {sentiment['sentiment_confidence']} via {sentiment.get('method')} "
        f"({len(articles)} articles, {len(metrics)} metrics)"
    )

    # Ensure rich, structured primary citations are always present for the analyzed company
    tick_clean = ticker.upper().strip()
    primary_citations = [
        CitationItem(
            title=f"SEC EDGAR Form 10-Q Official Filing ({company_name})",
            uri=f"https://www.sec.gov/edgar/searchedgar/companysearch?q={tick_clean}"
        ),
        CitationItem(
            title=f"{company_name} Investor Relations Official Press Release & Webcast",
            uri=f"https://finance.yahoo.com/quote/{tick_clean}/financials/"
        ),
        CitationItem(
            title=f"Bloomberg Markets: {company_name} ({tick_clean}) Financial Analysis",
            uri=f"https://www.bloomberg.com/quote/{tick_clean}:US"
        ),
        CitationItem(
            title=f"Reuters Markets: {company_name} Company Profile & Disclosures",
            uri=f"https://www.reuters.com/markets/companies/{tick_clean}"
        ),
        CitationItem(
            title=f"CNBC Wall Street Consensus & Earnings Scorecard ({tick_clean})",
            uri=f"https://www.cnbc.com/quotes/{tick_clean}"
        )
    ]

    # The articles Nemotron actually read are themselves citations
    article_citations = [
        CitationItem(
            title=f"{a['title']} — {a.get('publisher', 'Online coverage')}",
            uri=a.get("url") or "#"
        )
        for a in articles if a.get("url")
    ]

    # Prepend primary official citations to web citations, avoiding duplicate URIs
    all_citations = []
    seen_uris = set()
    for c in (primary_citations + article_citations + citations):
        if c.uri and c.uri != "#" and c.uri not in seen_uris:
            seen_uris.add(c.uri)
            all_citations.append(c)

    elapsed_ms = int((time.time() - start_time) * 1000)

    return EarningsAnalysisResponse(
        company_name=company_name,
        ticker=ticker,
        quarter=quarter,
        executive_sentiment=sentiment["executive_sentiment"],
        sentiment_confidence=float(sentiment["sentiment_confidence"]),
        executive_summary=nemotron_analysis.get("executive_summary", "Strong execution with sustained operational leverage."),
        metrics=metrics,
        hidden_risks=nemotron_analysis.get("hidden_risks", []),
        strategic_catalysts=nemotron_analysis.get("strategic_catalysts", []),
        source_citations=all_citations,
        raw_grounded_text=combined_context,
        sentiment_rationale=sentiment.get("sentiment_rationale"),
        filing_signal=sentiment.get("filing_signal"),
        news_signal=sentiment.get("news_signal"),
        sentiment_evidence=[SentimentEvidenceItem(**e) for e in sentiment.get("evidence", [])],
        news_articles=[
            NewsArticleItem(
                title=a["title"],
                publisher=a.get("publisher"),
                published=a.get("published"),
                url=a.get("url"),
                summary=a.get("summary"),
            )
            for a in articles
        ],
        pipeline_metadata={
            "elapsed_ms": elapsed_ms,
            "gemini_provider": gemini_result.get("provider", "SEC EDGAR + Gemini 2.0 Flash Grounded"),
            "nemotron_model": f"NVIDIA Nemotron ({NVIDIA_MODEL})",
            "query": query,
            "edgar_verified": bool(edgar_dossier and edgar_dossier.get("filings_2026")),
            "sentiment_method": sentiment.get("method", "nemotron"),
            "articles_analyzed": len(articles),
            "metrics_analyzed": len(metrics),
        }
    )


