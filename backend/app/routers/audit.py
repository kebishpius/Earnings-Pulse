import logging
from fastapi import APIRouter, HTTPException
from app.schemas.models import (
    PortfolioAuditRequest,
    PortfolioAuditResponse,
    SubscriptionLeak,
    SpendingAnomaly,
    ConcentrationRisk
)
from app.services.nemotron_service import audit_portfolio_and_spending

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Portfolio Audit"])

@router.post("/audit-portfolio", response_model=PortfolioAuditResponse)
async def audit_portfolio(request: PortfolioAuditRequest):
    """
    Accepts mock portfolio holdings and transaction log.
    Uses NVIDIA Nemotron to flag subscription leaks, unusual spending behaviors,
    and single-asset or sector concentration risks.
    """
    logger.info(f"Incoming /api/audit-portfolio with {len(request.holdings)} holdings and {len(request.transactions)} transactions.")

    holdings_data = [h.model_dump() for h in request.holdings]
    transactions_data = [t.model_dump() for t in request.transactions]

    try:
        audit_result = audit_portfolio_and_spending(holdings_data, transactions_data)
    except Exception as e:
        logger.error(f"Error auditing portfolio with Nemotron: {e}")
        raise HTTPException(status_code=500, detail=f"Portfolio audit error: {str(e)}")

    # Format subscription leaks
    sub_leaks = []
    for s in audit_result.get("subscription_leaks", []):
        sub_leaks.append(SubscriptionLeak(
            service=s.get("service", "Service"),
            monthly_cost=float(s.get("monthly_cost", 0.0)),
            annual_cost=float(s.get("annual_cost", 0.0)),
            frequency=s.get("frequency", "Monthly"),
            recommendation=s.get("recommendation", "Review active usage")
        ))

    # Format spending anomalies
    anomalies = []
    for a in audit_result.get("spending_anomalies", []):
        anomalies.append(SpendingAnomaly(
            category=a.get("category", "General"),
            description=a.get("description", "Unusual expense"),
            amount=float(a.get("amount", 0.0)),
            alert_reason=a.get("alert_reason", "Variance anomaly detected")
        ))

    # Format concentration risks
    conc_risks = []
    for c in audit_result.get("concentration_risks", []):
        conc_risks.append(ConcentrationRisk(
            asset_or_sector=c.get("asset_or_sector", "Asset"),
            allocation_pct=float(c.get("allocation_pct", 0.0)),
            max_recommended_pct=float(c.get("max_recommended_pct", 20.0)),
            risk_comment=c.get("risk_comment", "Exceeds prudent allocation ceiling")
        ))

    return PortfolioAuditResponse(
        overall_risk_score=int(audit_result.get("overall_risk_score", 50)),
        risk_level=audit_result.get("risk_level", "Moderate"),
        summary=audit_result.get("summary", "Portfolio analysis completed."),
        subscription_leaks=sub_leaks,
        spending_anomalies=anomalies,
        concentration_risks=conc_risks,
        actionable_recommendations=audit_result.get("actionable_recommendations", [])
    )
