import gzip
import json
import logging
import os
import re
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger("earningspulse.edgar")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TICKERS_CACHE_FILE = DATA_DIR / "company_tickers.json"

SEC_HEADERS = {
    "User-Agent": "EarningsPulse research@earningspulse.ai",
    "Accept-Encoding": "gzip, deflate"
}

_COMPANIES_INDEX: List[Dict[str, Any]] = []
_TICKER_MAP: Dict[str, Dict[str, Any]] = {}


def _init_companies_cache():
    global _COMPANIES_INDEX, _TICKER_MAP
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not TICKERS_CACHE_FILE.exists() or TICKERS_CACHE_FILE.stat().st_size == 0:
        logger.info("Downloading official SEC EDGAR company_tickers.json...")
        try:
            req = urllib.request.Request(
                "https://www.sec.gov/files/company_tickers.json",
                headers=SEC_HEADERS
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = resp.read()
                content = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
                with open(TICKERS_CACHE_FILE, "wb") as f:
                    f.write(content)
        except Exception as e:
            logger.warning(f"Could not download company_tickers.json: {e}")

    if TICKERS_CACHE_FILE.exists():
        try:
            with open(TICKERS_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                _COMPANIES_INDEX = list(data.values()) if isinstance(data, dict) else data
                _TICKER_MAP = {c["ticker"].upper(): c for c in _COMPANIES_INDEX}
                logger.info(f"Loaded {len(_COMPANIES_INDEX)} SEC EDGAR companies into in-memory index.")
        except Exception as e:
            logger.error(f"Error loading company_tickers.json: {e}")


# Initialize on import
_init_companies_cache()


def _sec_get_json(url: str, timeout: int = 6) -> Optional[Dict[str, Any]]:
    """Helper to fetch and parse JSON from SEC EDGAR with gzip handling and user-agent."""
    try:
        req = urllib.request.Request(url, headers=SEC_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if raw.startswith(b"\x1f\x8b"):
                text = gzip.decompress(raw).decode("utf-8", errors="replace")
            else:
                text = raw.decode("utf-8", errors="replace")
            return json.loads(text)
    except Exception as e:
        logger.warning(f"SEC API request error for {url}: {e}")
        return None


def get_company_by_ticker(ticker: str) -> Optional[Dict[str, Any]]:
    """Fast O(1) lookup of company by ticker symbol."""
    if not _TICKER_MAP:
        _init_companies_cache()
    return _TICKER_MAP.get(ticker.strip().upper())


def search_edgar_companies(term: str, limit: int = 8) -> List[Dict[str, Any]]:
    """
    Blazingly fast search across all 10,400+ SEC EDGAR companies.
    Supports ticker symbols and company title fuzzy search with scoring.
    """
    if not term or not term.strip():
        # Popular defaults
        popular = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "PLTR", "AMD"]
        results = []
        for p in popular:
            c = get_company_by_ticker(p)
            if c:
                results.append({
                    "ticker": c["ticker"],
                    "company_name": c["title"],
                    "cik": c["cik_str"],
                    "cik_padded": str(c["cik_str"]).zfill(10),
                    "default_query": f"{c['title']} ({c['ticker']}) 2026 earnings report 10-Q SEC EDGAR"
                })
        return results[:limit]

    q = term.strip().lower()
    scored = []

    for c in _COMPANIES_INDEX:
        sym = c["ticker"].lower()
        title = c["title"].lower()
        score = 0

        if sym == q:
            score += 200
        elif sym.startswith(q):
            score += 120
        elif title.startswith(q):
            score += 90
        elif q in sym:
            score += 70
        elif q in title:
            score += 50
        else:
            # Word-level matching
            words = title.split()
            for w in words:
                if w.startswith(q):
                    score += 45
                    break

        if score > 0:
            scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for _, c in scored[:limit]:
        results.append({
            "ticker": c["ticker"],
            "company_name": c["title"],
            "cik": c["cik_str"],
            "cik_padded": str(c["cik_str"]).zfill(10),
            "default_query": f"{c['title']} ({c['ticker']}) 2026 earnings report 10-Q SEC EDGAR"
        })

    return results


def resolve_company_from_query(query: str) -> Optional[Dict[str, Any]]:
    """
    Extracts potential ticker symbol or company name from an arbitrary query string.
    Example: 'Palantir 2026 earnings' -> PLTR, 'NVDA Q2 report' -> NVDA, 'Snowflake Q2' -> SNOW
    """
    if not query:
        return None

    cleaned = query.strip()
    
    # 1. Exact ticker matches in words
    words = re.findall(r'[A-Za-z0-9]+', cleaned)
    for word in words:
        c = get_company_by_ticker(word)
        if c:
            return c

    # 2. Match words against company names
    for word in words:
        if len(word) >= 3 and word.lower() not in ("earnings", "report", "revenue", "quarter", "latest", "stock", "stocks", "sec", "edgar", "fiscal", "results"):
            matches = search_edgar_companies(word, limit=3)
            if matches:
                # Check if first word of title matches
                for m in matches:
                    title_first = m["company_name"].split()[0].lower()
                    if word.lower() == title_first or word.lower() in m["company_name"].lower():
                        return get_company_by_ticker(m["ticker"])
                return get_company_by_ticker(matches[0]["ticker"])

    # 3. Search full phrase
    matches = search_edgar_companies(cleaned, limit=1)
    if matches:
        return get_company_by_ticker(matches[0]["ticker"])

    return None


def fetch_edgar_2026_dossier(company_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Queries the official SEC EDGAR Submissions API and XBRL Facts API to extract
    verified 2026 financial numbers, latest 10-Q/10-K filings, and direct links.
    """
    cik_str = str(company_info["cik_str"]).zfill(10)
    cik_num = company_info["cik_str"]
    ticker = company_info["ticker"].upper()
    title = company_info["title"]

    dossier: Dict[str, Any] = {
        "company_name": title,
        "ticker": ticker,
        "cik": cik_num,
        "cik_padded": cik_str,
        "quarter": "FY2026",
        "filings_2026": [],
        "xbrl_metrics": {},
        "raw_text": "",
        "citations": []
    }

    # 1. Fetch Submissions (recent filings)
    url_sub = f"https://data.sec.gov/submissions/CIK{cik_str}.json"
    sub = _sec_get_json(url_sub)

    if sub:
        recent = sub.get("filings", {}).get("recent", {})
        forms = recent.get("form", [])
        dates = recent.get("filingDate", [])
        accns = recent.get("accessionNumber", [])
        docs = recent.get("primaryDocument", [])
        descs = recent.get("primaryDocDescription", [])

        latest_10q_period = ""
        for i in range(len(forms)):
            form = forms[i]
            date = dates[i]
            accn = accns[i]
            doc = docs[i]
            desc = descs[i] if i < len(descs) else form

            # Look for 2026 filings
            if form in ("10-Q", "10-K", "8-K") and "2026" in date:
                clean_accn = accn.replace("-", "")
                filing_url = f"https://www.sec.gov/ix?doc=/Archives/edgar/data/{cik_num}/{clean_accn}/{doc}"
                
                filing_item = {
                    "form": form,
                    "filing_date": date,
                    "description": desc or f"Form {form}",
                    "accession_number": accn,
                    "url": filing_url
                }
                dossier["filings_2026"].append(filing_item)

                if form == "10-Q" and not latest_10q_period:
                    month = int(date.split("-")[1]) if "-" in date else 6
                    q_num = 1 if month <= 4 else (2 if month <= 8 else 3)
                    latest_10q_period = f"Q{q_num} 2026"

        if latest_10q_period:
            dossier["quarter"] = latest_10q_period

        # Add top citations from official EDGAR filings
        for f in dossier["filings_2026"][:4]:
            dossier["citations"].append({
                "title": f"SEC EDGAR Form {f['form']} ({f['filing_date']}) - {title}",
                "uri": f["url"]
            })

    # 2. Fetch XBRL Facts (GAAP metrics)
    url_facts = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_str}.json"
    facts = _sec_get_json(url_facts)

    if facts:
        gaap = facts.get("facts", {}).get("us-gaap", {})
        
        def extract_2026_fact(concept_candidates: List[str]):
            for c in concept_candidates:
                if c in gaap and "units" in gaap[c]:
                    units = gaap[c]["units"]
                    u_key = "USD" if "USD" in units else list(units.keys())[0]
                    pts = units[u_key]
                    pts_2026 = [p for p in pts if p.get("fy") == 2026 or "2026" in str(p.get("end", ""))]
                    if pts_2026:
                        pts_2026.sort(key=lambda x: str(x.get("end", "")))
                        last_pt = pts_2026[-1]
                        return {
                            "concept": c,
                            "value": last_pt.get("val"),
                            "period": last_pt.get("fp", "Q"),
                            "end_date": last_pt.get("end"),
                            "form": last_pt.get("form")
                        }
            return None

        rev_fact = extract_2026_fact(["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"])
        eps_fact = extract_2026_fact(["EarningsPerShareDiluted", "EarningsPerShareBasic"])
        net_inc_fact = extract_2026_fact(["NetIncomeLoss", "ProfitLoss"])
        op_inc_fact = extract_2026_fact(["OperatingIncomeLoss"])
        gross_fact = extract_2026_fact(["GrossProfit"])

        dossier["xbrl_metrics"] = {
            "revenue": rev_fact,
            "eps": eps_fact,
            "net_income": net_inc_fact,
            "operating_income": op_inc_fact,
            "gross_profit": gross_fact
        }

        if rev_fact and rev_fact.get("period"):
            fp = rev_fact.get("period")
            if fp and fp.startswith("Q"):
                dossier["quarter"] = f"{fp} 2026"

    # 3. Build synthesis text for Nemotron & Gemini reasoning
    lines = [
        f"OFFICIAL SEC EDGAR REGULATORY FILING REPORT ({dossier['quarter']}):",
        f"Entity: {title} (CIK: {cik_str}, Ticker: {ticker})",
    ]

    metrics = dossier["xbrl_metrics"]
    if metrics.get("revenue") and metrics["revenue"].get("value"):
        r_val = metrics["revenue"]["value"]
        r_fmt = f"${r_val / 1e9:.2f} Billion" if abs(r_val) >= 1e9 else f"${r_val / 1e6:.2f} Million"
        lines.append(f"- Reported Net Revenue (Form {metrics['revenue'].get('form', '10-Q')}): {r_fmt}")

    if metrics.get("eps") and metrics["eps"].get("value") is not None:
        lines.append(f"- Reported Diluted EPS: ${metrics['eps']['value']:.2f}")

    if metrics.get("net_income") and metrics["net_income"].get("value"):
        ni_val = metrics["net_income"]["value"]
        ni_fmt = f"${ni_val / 1e9:.2f} Billion" if abs(ni_val) >= 1e9 else f"${ni_val / 1e6:.2f} Million"
        lines.append(f"- Net Income: {ni_fmt}")

    if metrics.get("operating_income") and metrics["operating_income"].get("value"):
        op_val = metrics["operating_income"]["value"]
        op_fmt = f"${op_val / 1e9:.2f} Billion" if abs(op_val) >= 1e9 else f"${op_val / 1e6:.2f} Million"
        lines.append(f"- Operating Income: {op_fmt}")

    if dossier["filings_2026"]:
        lines.append("\nOfficial 2026 SEC EDGAR Disclosures:")
        for fl in dossier["filings_2026"][:5]:
            lines.append(f"- Form {fl['form']} filed on {fl['filing_date']}: {fl['description']} ({fl['url']})")

    dossier["raw_text"] = "\n".join(lines)
    return dossier
