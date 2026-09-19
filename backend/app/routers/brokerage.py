import logging
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.snaptrade_service import snaptrade_service, SANDBOX_PROFILES

logger = logging.getLogger("earningspulse.brokerage")

router = APIRouter(prefix="/api/brokerage", tags=["brokerage"])

class BrokerageSessionRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="User identifier (Auth0 ID or persistent device UUID)")
    broker: Optional[str] = Field(default=None, description="Broker key: ROBINHOOD, FIDELITY, SCHWAB, WEBULL, or None for selector")
    redirect_uri: Optional[str] = Field(default=None, description="Post-auth redirect callback URL")

class BrokerageSyncRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="User identifier")
    broker: Optional[str] = Field(default="ROBINHOOD", description="Broker key")

@router.get("/status")
def get_brokerage_status():
    """
    Returns connection status, supported brokers, and security disclosures.
    """
    return {
        "status": "online",
        "is_configured": snaptrade_service.is_configured,
        "mode": "live" if snaptrade_service.is_configured else "sandbox",
        "supported_brokers": [
            {
                "id": "ROBINHOOD",
                "name": "Robinhood",
                "tagline": "Commission-Free Stocks & Crypto",
                "badge": "Popular",
                "color": "emerald"
            },
            {
                "id": "FIDELITY",
                "name": "Fidelity Investments",
                "tagline": "Retirement & Core Index Portfolios",
                "badge": "Institutional",
                "color": "green"
            },
            {
                "id": "SCHWAB",
                "name": "Charles Schwab",
                "tagline": "Full-Service Wealth & Equities",
                "badge": "Large Cap",
                "color": "blue"
            },
            {
                "id": "WEBULL",
                "name": "Webull",
                "tagline": "Active Trader & Margin Accounts",
                "badge": "Active",
                "color": "amber"
            }
        ],
        "security_info": {
            "type": "Institutional Delegated OAuth (SnapTrade)",
            "compliance": "SOC-2 Type II Certified",
            "encryption": "AES-256 bit end-to-end / TLS 1.3",
            "read_only": True,
            "passwords_stored": False,
            "can_trade": False,
            "can_transfer": False,
            "description": "EarningsPulse never sees, collects, or stores your broker passwords or 2FA credentials. Access is strictly read-only for asset allocation and risk auditing."
        }
    }

@router.post("/session")
async def create_brokerage_session(request: BrokerageSessionRequest):
    """
    Initiates a secure connection session via SnapTrade or interactive sandbox.
    """
    effective_user_id = request.user_id or f"ep_anon_{uuid.uuid4().hex[:12]}"
    try:
        session = await snaptrade_service.create_connection_session(
            user_id=effective_user_id,
            broker=request.broker,
            redirect_uri=request.redirect_uri
        )
        return session
    except Exception as e:
        logger.error(f"Failed to create brokerage session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_brokerage_portfolio(request: BrokerageSyncRequest):
    """
    Syncs holdings from the connected broker and formats them for the Nemotron Risk Auditor.
    """
    effective_user_id = request.user_id or "ep_user_default"
    try:
        result = await snaptrade_service.sync_holdings(
            user_id=effective_user_id,
            broker=request.broker
        )
        return result
    except Exception as e:
        logger.error(f"Failed to sync holdings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
