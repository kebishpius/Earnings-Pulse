import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_snaptrade_endpoints():
    print("=== Testing SnapTrade Status Endpoint ===")
    r = client.get("/api/brokerage/status")
    assert r.status_code == 200, f"Status check failed: {r.text}"
    status_data = r.json()
    print("Status:", status_data["status"])
    print("Mode:", status_data["mode"])
    print("Supported Brokers:", [b["name"] for b in status_data["supported_brokers"]])
    print("Security Info:", status_data["security_info"]["compliance"])

    print("\n=== Testing SnapTrade Session Creation (Robinhood) ===")
    session_res = client.post("/api/brokerage/session", json={
        "user_id": "test_user_123",
        "broker": "ROBINHOOD"
    })
    assert session_res.status_code == 200, f"Session creation failed: {session_res.text}"
    session_data = session_res.json()
    print("Session Response:", session_data)
    assert "redirect_url" in session_data

    print("\n=== Testing SnapTrade Session Creation (Fidelity) ===")
    fidelity_res = client.post("/api/brokerage/session", json={
        "user_id": "test_user_123",
        "broker": "FIDELITY"
    })
    assert fidelity_res.status_code == 200, f"Fidelity session failed: {fidelity_res.text}"
    print("Fidelity Session Response:", fidelity_res.json())

    print("\n=== Testing SnapTrade Holdings Sync (Robinhood) ===")
    sync_rh = client.post("/api/brokerage/sync", json={
        "user_id": "test_user_123",
        "broker": "ROBINHOOD"
    })
    assert sync_rh.status_code == 200, f"Robinhood sync failed: {sync_rh.text}"
    rh_data = sync_rh.json()
    print(f"Robinhood institution: {rh_data['institution_name']}, total value: ${rh_data['total_value']:,.2f}")
    assert len(rh_data["holdings"]) > 0
    print(f"Robinhood Holdings count: {len(rh_data['holdings'])}")
    for h in rh_data["holdings"]:
        print(f"  - {h['symbol']}: {h['shares']} shares, ${h['current_value']:,.2f} ({h['allocation_pct']}%)")

    print("\n=== Testing SnapTrade Holdings Sync (Fidelity) ===")
    sync_fid = client.post("/api/brokerage/sync", json={
        "user_id": "test_user_123",
        "broker": "FIDELITY"
    })
    assert sync_fid.status_code == 200, f"Fidelity sync failed: {sync_fid.text}"
    fid_data = sync_fid.json()
    print(f"Fidelity institution: {fid_data['institution_name']}, total value: ${fid_data['total_value']:,.2f}")
    assert len(fid_data["holdings"]) > 0
    for h in fid_data["holdings"]:
        print(f"  - {h['symbol']}: {h['shares']} shares, ${h['current_value']:,.2f} ({h['allocation_pct']}%)")

    print("\n[SUCCESS] All SnapTrade tests passed successfully!")

if __name__ == "__main__":
    test_snaptrade_endpoints()
