# ⚡ EarningsPulse — Dual-Model Financial Intelligence & Risk Router
### SteelHacks XIII Hackathon Submission

**EarningsPulse** is an advanced, full-stack financial decision engine and risk routing platform. It harnesses a state-of-the-art dual-model AI pipeline: **Google Gemini (with real-time Google Search grounding)** for live SEC filings, transcript retrieval, and web citations, coupled with **NVIDIA Nemotron (via NVIDIA NIM)** for high-conviction quantitative reasoning, market volatility routing, and portfolio leak auditing.

---

## 🏛️ System Architecture

```
                                 ┌──────────────────────────────────────────────┐
                                 │     User Query / Breaking Wire / Portfolio   │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                                        ▼
                                ┌────────────────────────────────────────────────┐
                                │      Frontend Dashboard (React + Tailwind)     │
                                │   Auth0 Authentication + Instant Demo Bypass   │
                                └──────────────────────┬─────────────────────────┘
                                                        │ HTTP REST (Proxy)
                                                        ▼
                                ┌────────────────────────────────────────────────┐
                                │          FastAPI Backend Application           │
                                └───────────────┬────────────────┬───────────────┘
                                                │                │
                        ┌───────────────────────┴─┐            ┌─┴───────────────────────┐
                        │                         │            │                         │
                        ▼                         ▼            ▼                         ▼
            ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
            │  Google GenAI SDK     │ │   NVIDIA NIM Client   │ │   Anthropic Fallback  │
            │  Gemini 2.0 Flash     │ │   NVIDIA Nemotron     │ │   Claude 3.5 Sonnet   │
            │  tools=[google_search]│ │   (Deep Reasoning)    │ │   (Redundancy Guard)  │
            └───────────┬───────────┘ └───────────┬───────────┘ └───────────────────────┘
                        │                         │
                        ▼                         ▼
            Live 10-Q SEC Filings     • Executive Sentiment (Bull/Bear)
            Earnings Press Releases   • Headline Metrics vs Consensus
            Web Grounding Citations   • Hidden Balance Sheet Headwinds
                                      • News Volatility Impact Tiers
                                      • Portfolio Concentration / Leaks
```

---

## ✨ Core Intelligence Workflows

### Tab 1: Live Earnings Fetcher & Analyzer
- **Real-Time Web Grounding**: Leverages Gemini with Google Search grounding (`tools=[{"google_search": {}}]`) to search live corporate transcripts, SEC 10-Q/10-K filings, and breaking quarterly disclosures.
- **Nemotron Executive Scorecard**: Generates Bullish/Neutral/Bearish sentiment badges, metric comparison cards (Revenue, EPS, Guidance, Operating Margins) with Beat/Miss tags, hidden risk alerts, strategic growth catalysts, and clickable Google search grounding citations.

### Tab 2: News & Signal Market Volatility Router
- **Automated Impact Tiering**: Routes breaking news headlines into color-coded impact tiers:
  - 🚨 **High Impact**: Flashing beacon for regulatory investigations, antitrust probes, and material restatements.
  - 🟡 **Medium Impact**: Macro policy, supply chain adjustments, and energy partnerships.
  - 🔵 **Low Impact**: Routine operational noise and minor product updates.
- **Anomaly Detection**: Evaluates whether an event constitutes a material systematic risk and issues portfolio hedging directives.

### Tab 3: Portfolio & Capital Leak Auditor
- **Quantitative Risk Analysis**: Analyzes investment holdings and cash transactions to compute an overall Risk Score (1–100).
- **Leak Detection**: Flags zombie digital subscriptions, duplicate software accounts, and annualized cash drain.
- **Concentration Thresholds**: Warns when single assets exceed institutional prudence caps (>25% allocation).

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and `npm`

---

### Step 1: Environment Configuration

A root `.env` file is pre-configured with the required API credentials:

```env
NVIDIA_API_KEY=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
GEMINI_API_KEY=AQ.Ab8RN6IKQxlbnVTRrIb3O_RU2oDvPQIIbtayWqN3aQrKQot8iA
ANTHROPIC_API_KEY=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

# Auth0 Configuration (Optional - Demo mode works out of the box)
VITE_AUTH0_DOMAIN=dev-steelhacks.us.auth0.com
VITE_AUTH0_CLIENT_ID=dummy_client_id_for_dev
```

> [!NOTE]
> The `.gitignore` strictly prevents `.env` and any credential files from being tracked in Git.

---

### Step 2: Run the Backend (FastAPI)

1. Open a terminal in `backend/`:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The backend will be live at `http://127.0.0.1:8000`.
   Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

---

### Step 3: Run the Frontend (React + Vite)

1. Open a second terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:5173` in your browser.

---

### Step 4: Production Deployment to Vercel

The project is fully configured for direct deployment to Vercel with zero setup:
1. Push or import this repository into your **Vercel Dashboard**.
2. Vercel automatically detects the root `vercel.json`, `package.json`, and `requirements.txt`.
3. Under **Settings -> Environment Variables**, add your keys:
   - `NVIDIA_API_KEY`
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `VITE_AUTH0_DOMAIN` (optional)
   - `VITE_AUTH0_CLIENT_ID` (optional)
4. Click **Deploy**. Vercel will build the React SPA and serve the backend API routes seamlessly.

---

## 🔒 Authentication & Hackathon Demo Mode

- **Auth0 Production Mode**: Enter your Auth0 domain and Client ID in `frontend/.env` to authenticate against your own Auth0 tenant.
- **Zero-Friction Demo Mode**: Click **"Instant Hackathon Demo Login"** on the landing screen to immediately access the full platform pre-authenticated as **Dr. Elena Vance (Lead Quantitative Risk Architect)**.

---

## 📡 API Endpoints Reference

### 1. `POST /api/fetch-and-analyze`
Fetches live earnings filing text using Gemini Google Search grounding, then analyzes metrics and risk factors using Nemotron.
- **Request Body**:
  ```json
  {
    "query": "Apple Q3 2024 earnings report revenue iPhone services",
    "ticker": "AAPL"
  }
  ```
- **Response**:
  ```json
  {
    "company_name": "Apple Inc.",
    "ticker": "AAPL",
    "quarter": "Q3 2024",
    "executive_sentiment": "Bullish",
    "sentiment_confidence": 0.92,
    "executive_summary": "Strong operational outperformance driven by record Services revenue...",
    "metrics": [
      {
        "metric": "Revenue",
        "value": "$85.78 Billion",
        "consensus": "$84.53 Billion",
        "beat_status": "Beat",
        "notes": "+5% YoY growth"
      }
    ],
    "hidden_risks": ["Greater China sales contraction (-6.5%)", "EU Digital Markets Act scrutiny"],
    "strategic_catalysts": ["Apple Intelligence device refresh cycle", "Accelerating Services margin expansion"],
    "source_citations": [
      { "title": "Apple Q3 2024 Earnings Press Release", "uri": "https://www.apple.com" }
    ]
  }
  ```

### 2. `POST /api/route-news`
Classifies breaking market events and press releases into risk tiers.
- **Request Body**:
  ```json
  {
    "headline": "DOJ Issues Civil Investigative Demand Regarding GPU Cloud Allocation",
    "source": "Financial Times"
  }
  ```
- **Response**:
  ```json
  {
    "headline": "DOJ Issues Civil Investigative Demand...",
    "impact_tier": "High",
    "is_material_risk": true,
    "sentiment": "Bearish",
    "urgency_score": 9,
    "market_impact_analysis": "Heightened scrutiny may cause volatility in high-beta tech multiples.",
    "recommended_action": "Hedge delta exposure via index put spreads."
  }
  ```

### 3. `POST /api/audit-portfolio`
Scans holdings and transaction ledgers for concentration and recurring spending drag.
- **Request Body**:
  ```json
  {
    "holdings": [
      { "symbol": "NVDA", "asset_name": "NVIDIA", "asset_type": "Equity", "allocation_pct": 48.5, "current_value": 48500 }
    ],
    "transactions": [
      { "date": "2024-08-01", "description": "Duplicate Spotify Subscription", "amount": 16.99, "category": "Entertainment" }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "overall_risk_score": 68,
    "risk_level": "Elevated",
    "subscription_leaks": [
      { "service": "Duplicate Spotify", "monthly_cost": 16.99, "annual_cost": 203.88, "recommendation": "Cancel redundant account" }
    ],
    "concentration_risks": [
      { "asset_or_sector": "NVDA", "allocation_pct": 48.5, "max_recommended_pct": 20.0, "risk_comment": "Position overconcentration creates drawdown vulnerability" }
    ]
  }
  ```

---

## 🏆 SteelHacks XIII Project Details
- **Team**: EarningsPulse Quantitative AI Engineering Team
- **Stack**: FastAPI, Python 3.13, React 18, Tailwind CSS, Vite, Auth0
- **AI Models**: Google Gemini 2.0 Flash with Google Search Grounding, NVIDIA Nemotron via NVIDIA NIM, Anthropic Claude 3.5 Sonnet
