from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Earnings Models ---

class FetchAndAnalyzeRequest(BaseModel):
    query: str = Field(..., description="Company name, ticker, or earnings phrase e.g. 'Apple Q2 earnings' or 'NVDA'")
    ticker: Optional[str] = Field(None, description="Optional explicit ticker symbol")

class MetricItem(BaseModel):
    metric: str
    value: str
    consensus: Optional[str] = "N/A"
    beat_status: Optional[str] = "N/A"  # Beat, Miss, In-Line, Unknown
    notes: Optional[str] = None

class CitationItem(BaseModel):
    title: Optional[str] = "Source"
    uri: Optional[str] = "#"

class EarningsAnalysisResponse(BaseModel):
    company_name: str
    ticker: str
    quarter: str
    executive_sentiment: str  # Bullish, Neutral, Bearish
    sentiment_confidence: float = 0.85
    executive_summary: str
    metrics: List[MetricItem] = []
    hidden_risks: List[str] = []
    strategic_catalysts: List[str] = []
    source_citations: List[CitationItem] = []
    raw_grounded_text: Optional[str] = None
    pipeline_metadata: Dict[str, Any] = {}

# --- News Routing Models ---

class RouteNewsRequest(BaseModel):
    headline: str
    content: Optional[str] = None
    source: Optional[str] = "Wire Service"

class RouteNewsResponse(BaseModel):
    headline: str
    impact_tier: str  # High, Medium, Low
    is_material_risk: bool
    sentiment: str  # Bullish, Bearish, Neutral
    category: str  # e.g., Macro, Earnings, Regulatory, Supply Chain, M&A
    urgency_score: int  # 1 - 10
    market_impact_analysis: str
    recommended_action: str
    cited_sources: List[CitationItem] = []


# --- Portfolio Audit Models ---

class HoldingItem(BaseModel):
    symbol: str
    asset_name: Optional[str] = None
    asset_type: str = "Equity"  # Equity, Crypto, Fixed Income, Cash
    allocation_pct: float
    current_value: float

class TransactionItem(BaseModel):
    date: str
    description: str
    amount: float
    category: Optional[str] = "Uncategorized"

class PortfolioAuditRequest(BaseModel):
    holdings: List[HoldingItem] = []
    transactions: List[TransactionItem] = []
    model_choice: Optional[str] = "council"  # council, nemotron, claude, gemini
    user_id: Optional[str] = None

class SubscriptionLeak(BaseModel):
    service: str
    monthly_cost: float
    annual_cost: float
    frequency: str = "Monthly"
    recommendation: str

class SpendingAnomaly(BaseModel):
    category: str
    description: str
    amount: float
    alert_reason: str

class ConcentrationRisk(BaseModel):
    asset_or_sector: str
    allocation_pct: float
    max_recommended_pct: float
    risk_comment: str

class PortfolioAuditResponse(BaseModel):
    overall_risk_score: int  # 1 - 100
    risk_level: str  # Low, Moderate, Elevated, High
    subscription_leaks: List[SubscriptionLeak] = []
    spending_anomalies: List[SpendingAnomaly] = []
    concentration_risks: List[ConcentrationRisk] = []
    actionable_recommendations: List[str] = []
    summary: str
    model_used: Optional[str] = "Tri-Model AI Council (Gemini + Nemotron + Claude)"
    council_insights: Optional[Dict[str, Any]] = None

