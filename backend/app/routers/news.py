import logging
from fastapi import APIRouter, HTTPException
from app.schemas.models import RouteNewsRequest, RouteNewsResponse
from app.services.nemotron_service import route_financial_news

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["News"])

@router.post("/route-news", response_model=RouteNewsResponse)
async def route_news(request: RouteNewsRequest):
    """
    Ingests breaking financial news or press releases.
    Uses NVIDIA Nemotron to classify them into market impact tiers (High, Medium, Low),
    identifies material risk anomalies, and outputs actionable asset allocation guidance.
    """
    headline = request.headline.strip()
    if not headline:
        raise HTTPException(status_code=400, detail="News headline cannot be empty.")

    logger.info(f"Incoming /api/route-news for headline: '{headline}'")

    try:
        evaluation = route_financial_news(
            headline=headline,
            content=request.content or "",
            source=request.source or "Wire Service"
        )
    except Exception as e:
        logger.error(f"Error evaluating news with Nemotron: {e}")
        raise HTTPException(status_code=500, detail=f"News routing error: {str(e)}")

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
        )
    )
