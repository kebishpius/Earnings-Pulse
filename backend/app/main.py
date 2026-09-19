import sys
from pathlib import Path

# Ensure backend root is on sys.path when executed directly as a script
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import NVIDIA_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, NVIDIA_MODEL
from app.routers import earnings, news, audit, advisor, brokerage

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("earningspulse")

app = FastAPI(
    title="EarningsPulse API",
    description="Dual-Model Financial Decision & Risk Routing Platform (Gemini + NVIDIA Nemotron) for SteelHacks XIII",
    version="1.0.0"
)

# Enable CORS for Frontend React dev and production builds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(earnings.router)
app.include_router(news.router)
app.include_router(audit.router)
app.include_router(advisor.router)
app.include_router(brokerage.router)

@app.get("/")
def read_root():
    return {
        "name": "EarningsPulse AI Backend",
        "event": "SteelHacks XIII",
        "models": {
            "retrieval": "Google Gemini 2.0 Flash with Google Search Grounding",
            "reasoning": f"NVIDIA Nemotron ({NVIDIA_MODEL}) via NVIDIA NIM"
        },
        "status": "online",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "nvidia_configured": bool(NVIDIA_API_KEY),
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "nemotron_model": NVIDIA_MODEL,
        "features": ["earnings", "news", "portfolio-audit", "ai-advisor", "data-upload"]
    }

@app.get("/api/presets")
def get_presets():
    """Provides sample data presets for hackathon demo testing."""
    return {
        "sample_tickers": [
            {"name": "Apple Q3 Earnings", "query": "Apple Q3 2026 earnings report"},
            {"name": "NVIDIA Q2 Earnings", "query": "NVIDIA Q2 FY2026 earnings release"},
            {"name": "Microsoft Cloud & AI", "query": "Microsoft Q4 2026 earnings cloud revenue"},
            {"name": "Tesla Auto Margins", "query": "Tesla recent quarterly earnings automotive margins robotaxi 2026"}
        ],
        "sample_news": [
            {
                "headline": "DOJ Prepares Landmark Antitrust Monopolization Lawsuit Against Semiconductor Giant",
                "source": "Financial Times",
                "content": "Federal antitrust regulators have intensified their investigative probe regarding potential exclusionary bundling in GPU software distribution."
            },
            {
                "headline": "Federal Reserve Signals Potential 50bps Interest Rate Cut Following Labor Market Cool Down",
                "source": "Wall Street Journal",
                "content": "FOMC members highlighted balanced risk between employment growth and target inflation trajectory."
            },
            {
                "headline": "Enterprise SaaS Provider Reports 38% Gross Margin Squeeze Due to Cloud Inference Costs",
                "source": "Bloomberg Wire",
                "content": "Operating losses widened as infrastructure compute expenditure outpaced software subscription renewals."
            },
            {
                "headline": "Leading EV Manufacturer Exceeds Quarterly Delivery Target with Global Delivery Surge of 480,000 Units",
                "source": "Reuters",
                "content": "Strong factory output in Shanghai and Austin propelled deliveries above Wall Street consensus estimates."
            }
        ],
        "sample_portfolio": {
            "holdings": [
                {"symbol": "NVDA", "asset_name": "NVIDIA Corp", "asset_type": "Equity", "allocation_pct": 46.5, "current_value": 46500.00},
                {"symbol": "AAPL", "asset_name": "Apple Inc", "asset_type": "Equity", "allocation_pct": 24.0, "current_value": 24000.00},
                {"symbol": "BTC", "asset_name": "Bitcoin", "asset_type": "Crypto", "allocation_pct": 18.5, "current_value": 18500.00},
                {"symbol": "TSLA", "asset_name": "Tesla Inc", "asset_type": "Equity", "allocation_pct": 8.0, "current_value": 8000.00},
                {"symbol": "USD", "asset_name": "Cash Equivalents", "asset_type": "Cash", "allocation_pct": 3.0, "current_value": 3000.00}
            ],
            "transactions": [
                {"date": "2026-08-01", "description": "AWS Cloud Reserved Instance", "amount": 145.00, "category": "Cloud & Infra"},
                {"date": "2026-08-03", "description": "Midjourney AI Subscription", "amount": 60.00, "category": "AI Tools"},
                {"date": "2026-08-05", "description": "Equinox Luxury Health Club", "amount": 295.00, "category": "Fitness"},
                {"date": "2026-08-09", "description": "Duplicate Spotify Premium Plan", "amount": 16.99, "category": "Entertainment"},
                {"date": "2026-08-14", "description": "Unused Bloomberg Professional Terminal Add-on", "amount": 420.00, "category": "Finance Sub"},
                {"date": "2026-08-18", "description": "High Frequency Speculative Options Trade Fee", "amount": 650.00, "category": "Trading Outflow"},
                {"date": "2026-08-22", "description": "ChatGPT Plus Team Account", "amount": 50.00, "category": "AI Tools"}
            ]
        }
    }


if __name__ == "__main__":
    import uvicorn
    from app.config import HOST, PORT
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)

