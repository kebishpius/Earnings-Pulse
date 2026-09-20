# ⚡ EarningsPulse — Dual-Model Financial Intelligence & Risk Router
### SteelHacks XIII Hackathon Submission

**EarningsPulse** is an advanced, full-stack financial decision engine and risk routing platform. It harnesses a state-of-the-art dual-model AI pipeline: **Google Gemini (with real-time Google Search grounding)** for live SEC filings, transcript retrieval, web citations, and broker CSV parsing, coupled with **NVIDIA Nemotron (via NVIDIA NIM)** for high-conviction quantitative reasoning, market volatility routing, portfolio leak auditing, and the conversational AI Financial Advisor.

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
            │  Google GenAI SDK     │ │   NVIDIA NIM Client   │ │  Local Advisor Engine │
            │  Gemini 2.0 Flash     │ │   NVIDIA Nemotron     │ │  Deterministic Quant  │
            │  tools=[google_search]│ │   (Deep Reasoning)    │ │  (Offline Safety Net) │
            └───────────┬───────────┘ └───────────┬───────────┘ └───────────────────────┘
                        │                         │
                        ▼                         ▼
            Live 10-Q SEC Filings     • Executive Sentiment (Bull/Bear)
            Earnings Press Releases   • Headline Metrics vs Consensus
            Web Grounding Citations   • Hidden Balance Sheet Headwinds
                                      • Upcoming Earnings Dates & Consensus
                                      • Portfolio Concentration / Leaks
```

---

## ✨ Core Intelligence Workflows

### Tab 1: Live Earnings Fetcher & Analyzer
- **Real-Time Web Grounding**: Leverages Gemini with Google Search grounding (`tools=[{"google_search": {}}]`) to search live corporate transcripts, SEC 10-Q/10-K filings, and breaking quarterly disclosures.
- **Nemotron Executive Scorecard**: Generates Bullish/Neutral/Bearish sentiment badges, metric comparison cards (Revenue, EPS, Guidance, Operating Margins) with Beat/Miss tags, hidden risk alerts, strategic growth catalysts, and clickable Google search grounding citations.

### Tab 2: Earnings Radar & Calendar
Answers one question for every company on your watchlist: **when do they report next, and how have they handled the last four quarters?**
- **Confirmed vs projected dates**: A date is *confirmed* when the company appears on the published Nasdaq earnings calendar (which only reaches a few weeks out), and *projected* otherwise — estimated from the same fiscal quarter a year earlier, which is how companies actually schedule. The two are labeled distinctly and never conflated.
- **Consensus going in**: Street EPS estimate and analyst count for the upcoming quarter.
- **Beat/miss history**: The last four quarters of reported EPS against consensus, as a diverging strip, plus the stock's move around the most recent report (close before → close after, so it reads correctly whether the company reports pre-market or after the close).
- **Watchlist-driven**: Edit the watchlist inline or from your profile; the two share one source of truth. Tickers are validated against SEC EDGAR's company list on entry.
- **Hand-off to Tab 1**: "Analyze last quarter" sends the company straight into the full Gemini + Nemotron earnings analysis.

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
    "query": "Apple Q3 2026 earnings report revenue iPhone services",
    "ticker": "AAPL"
  }
  ```
- **Response**:
  ```json
  {
    "company_name": "Apple Inc.",
    "ticker": "AAPL",
    "quarter": "Q3 2026",
    "executive_sentiment": "Bullish",
    "sentiment_confidence": 0.94,
    "executive_summary": "Strong operational outperformance driven by record Services revenue...",
    "metrics": [
      {
        "metric": "Revenue",
        "value": "$94.80 Billion",
        "consensus": "$93.10 Billion",
        "beat_status": "Beat",
        "notes": "+7.2% YoY growth"
      }
    ],
    "hidden_risks": ["Greater China competitive pricing pressure", "EU Digital Markets Act compliance"],
    "strategic_catalysts": ["Apple Intelligence multi-year device refresh cycle", "Accelerating Services margin expansion"],
    "source_citations": [
      { "title": "Apple Q3 2026 Earnings Press Release", "uri": "https://www.apple.com" }
    ]
  }
  ```

### 2. `GET /api/earnings-calendar`
Returns the Earnings Radar feed for a watchlist. No API key required — backed by the public Nasdaq earnings calendar and surprise history, SEC EDGAR 8-K item 2.02 filings, and the public price feed.
- **Query**: `?tickers=NVDA,AAPL,COST&window=30` (`window` = days ahead to scan for confirmed dates, 7–45)
- **Response**:
  ```json
  {
    "today": "2026-09-19",
    "events": [
      {
        "ticker": "NVDA",
        "company_name": "NVIDIA CORP",
        "date": "2026-11-18",
        "confirmed": false,
        "timing": "unspecified",
        "days_away": 60,
        "consensus_eps": 2.47,
        "last_report": {
          "date": "2026-08-26", "eps": 2.22, "consensus": 2.09,
          "surprise_pct": 6.22, "result": "Beat", "reaction_pct": 7.01
        },
        "history": [{ "fiscal_quarter": "Jul 2026", "surprise_pct": 6.22, "result": "Beat" }],
        "beats_of_last": { "beats": 4, "of": 4 },
        "price": { "last": 222.27, "day_change_pct": 1.34 }
      }
    ],
    "unscheduled": [],
    "also_reporting": [{ "ticker": "TSM", "date": "2026-10-15", "market_cap": 2231545630000 }],
    "confirmed_count": 0
  }
  ```

`POST /api/route-news` (headline risk-tier classification) remains available on the backend, though no screen calls it since the news router was replaced.

### 3. `POST /api/audit-portfolio`
Scans holdings and transaction ledgers for concentration and recurring spending drag.
- **Request Body**:
  ```json
  {
    "holdings": [
      { "symbol": "NVDA", "asset_name": "NVIDIA", "asset_type": "Equity", "allocation_pct": 48.5, "current_value": 48500 }
    ],
    "transactions": [
      { "date": "2026-08-01", "description": "Duplicate Spotify Subscription", "amount": 16.99, "category": "Entertainment" }
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
- **AI Models**: Google Gemini 2.0 Flash with Google Search Grounding (earnings retrieval + CSV parsing), NVIDIA Nemotron via NVIDIA NIM (quantitative reasoning + AI Financial Advisor)
