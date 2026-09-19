import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("=== Testing 1: Health & Root ===")
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    print("Root output:", r.json())

    r_health = client.get("/api/health")
    assert r_health.status_code == 200, f"Health check failed: {r_health.text}"
    print("Health output:", r_health.json())

    print("\n=== Testing 2: POST /api/route-news ===")
    news_payload = {
        "headline": "DOJ Issues Civil Investigative Demand Over AI Data Center Power Allocations",
        "source": "Financial Times",
        "content": "Federal antitrust division requested internal communication records."
    }
    r_news = client.post("/api/route-news", json=news_payload)
    print("News status:", r_news.status_code)
    assert r_news.status_code == 200, f"News routing failed: {r_news.text}"
    news_data = r_news.json()
    print("Impact tier:", news_data.get("impact_tier"))
    print("Material risk:", news_data.get("is_material_risk"))
    print("Market impact analysis:", news_data.get("market_impact_analysis"))

    print("\n=== Testing 3: POST /api/audit-portfolio ===")
    audit_payload = {
        "holdings": [
            {"symbol": "NVDA", "asset_name": "NVIDIA", "asset_type": "Equity", "allocation_pct": 52.0, "current_value": 52000.0},
            {"symbol": "USD", "asset_name": "Cash", "asset_type": "Cash", "allocation_pct": 48.0, "current_value": 48000.0}
        ],
        "transactions": [
            {"date": "2024-08-01", "description": "Unused Gym Membership", "amount": 80.0, "category": "Fitness"},
            {"date": "2024-08-05", "description": "Duplicate Streaming Sub", "amount": 15.99, "category": "Entertainment"}
        ]
    }
    r_audit = client.post("/api/audit-portfolio", json=audit_payload)
    print("Audit status:", r_audit.status_code)
    assert r_audit.status_code == 200, f"Audit failed: {r_audit.text}"
    audit_data = r_audit.json()
    print("Overall risk score:", audit_data.get("overall_risk_score"))
    print("Subscription leaks detected:", len(audit_data.get("subscription_leaks", [])))
    print("Concentration risks flagged:", len(audit_data.get("concentration_risks", [])))

    print("\n=== Testing 4: POST /api/fetch-and-analyze ===")
    earn_payload = {
        "query": "Apple Q3 earnings"
    }
    r_earn = client.post("/api/fetch-and-analyze", json=earn_payload)
    print("Earnings status:", r_earn.status_code)
    assert r_earn.status_code == 200, f"Earnings failed: {r_earn.text}"
    earn_data = r_earn.json()
    print("Company:", earn_data.get("company_name"))
    print("Sentiment:", earn_data.get("executive_sentiment"))
    print("Metrics count:", len(earn_data.get("metrics", [])))
    print("Hidden risks count:", len(earn_data.get("hidden_risks", [])))
    print("Citations count:", len(earn_data.get("source_citations", [])))
    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY! [OK]")

if __name__ == "__main__":
    run_tests()
