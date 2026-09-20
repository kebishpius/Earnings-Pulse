"""
Forward-looking earnings calendar for a user's watchlist.

Answers the question the Radar tab is built around: which of my companies
reports next, when, and how did they do last time.

Three public feeds, no API key between them:

  * Nasdaq earnings calendar (per trading day) — confirmed report dates,
    whether a company reports before the open or after the close, and the
    consensus EPS the street is carrying into it.
  * Nasdaq earnings surprise (per symbol) — the last four quarters of actual
    EPS against consensus, which is the only free source here that supports an
    honest "beat" or "miss" rather than a guess.
  * SEC EDGAR 8-K item 2.02 ("Results of Operations") — the regulatory record
    of when a company actually announced. Used as the fallback date history
    when Nasdaq is unreachable.

Confirmed dates only exist a few weeks out, and most watchlists are full of
companies reporting in two months. So a date is either *confirmed* (the
company appears on the Nasdaq calendar) or *projected* from the same fiscal
quarter a year earlier, and the two are never conflated — the API marks which
one it is and the UI says so.
"""

import datetime as dt
import gzip
import json
import logging
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

from app.services.edgar_service import get_company_by_ticker, _sec_get_json
from app.services.price_service import fetch_price_history, PriceUnavailable

logger = logging.getLogger(__name__)

# Nasdaq's public JSON endpoints answer 403 to an unfamiliar agent.
NASDAQ_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Origin": "https://www.nasdaq.com",
    "Referer": "https://www.nasdaq.com/",
}

MAX_TICKERS = 12          # a watchlist beyond this is a screener, not a radar
MAX_WINDOW_DAYS = 45
DEFAULT_WINDOW_DAYS = 30

_CALENDAR_TTL = 3600      # confirmed dates move rarely; an hour is plenty
_SURPRISE_TTL = 21600     # last quarter's result does not change for 90 days
_CACHE: Dict[str, Dict[str, Any]] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Plumbing
# ─────────────────────────────────────────────────────────────────────────────

def _cached(key: str, ttl: int, producer):
    """Memoize `producer()` under `key`. Failures are not cached, so a blip
    upstream does not blank the tab for the rest of the TTL."""
    hit = _CACHE.get(key)
    if hit and time.time() - hit["ts"] < ttl:
        return hit["data"]
    data = producer()
    if data is not None:
        _CACHE[key] = {"ts": time.time(), "data": data}
    return data


def _get_json(url: str, headers: Dict[str, str], timeout: int = 10) -> Optional[Dict[str, Any]]:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
        body = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
        return json.loads(body.decode("utf-8", errors="replace"))
    except Exception as e:
        logger.warning(f"Calendar feed request failed for {url}: {e}")
        return None


def _to_float(val: Any) -> Optional[float]:
    """Parse the money-ish strings these feeds mix into numeric columns
    ('$2.09', '(0.14)', '1,234', 'N/A')."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s.upper() in {"N/A", "NA", "--", "-"}:
        return None
    negative = s.startswith("(") and s.endswith(")")
    s = re.sub(r"[^0-9.\-]", "", s)
    if not s or s in {"-", "."}:
        return None
    try:
        v = float(s)
    except ValueError:
        return None
    return -v if negative else v


def _parse_us_date(val: str) -> Optional[dt.date]:
    """Nasdaq writes dates as M/D/YYYY."""
    if not val:
        return None
    try:
        return dt.datetime.strptime(val.strip(), "%m/%d/%Y").date()
    except ValueError:
        return None


def _normalize_timing(raw: str) -> str:
    t = (raw or "").lower()
    if "pre-market" in t or "before" in t:
        return "pre-market"
    if "after-hours" in t or "after" in t:
        return "after-hours"
    return "unspecified"


def _nearest_weekday(d: dt.date) -> dt.date:
    """Nudge a projected date off the weekend — nobody reports on a Saturday."""
    if d.weekday() == 5:
        return d - dt.timedelta(days=1)
    if d.weekday() == 6:
        return d + dt.timedelta(days=1)
    return d


# ─────────────────────────────────────────────────────────────────────────────
# Feed 1 — Nasdaq confirmed calendar, one trading day at a time
# ─────────────────────────────────────────────────────────────────────────────

def _calendar_day(day: dt.date) -> List[Dict[str, Any]]:
    if day.weekday() >= 5:
        return []

    def fetch():
        payload = _get_json(
            f"https://api.nasdaq.com/api/calendar/earnings?date={day.isoformat()}",
            NASDAQ_HEADERS,
        )
        if payload is None:
            return None
        rows = ((payload.get("data") or {}).get("rows")) or []
        out = []
        for r in rows:
            symbol = (r.get("symbol") or "").strip().upper()
            if not symbol:
                continue
            out.append({
                "ticker": symbol,
                "company_name": (r.get("name") or "").strip(),
                "date": day.isoformat(),
                "timing": _normalize_timing(r.get("time")),
                "consensus_eps": _to_float(r.get("epsForecast")),
                "num_estimates": int(_to_float(r.get("noOfEsts")) or 0),
                "fiscal_quarter": (r.get("fiscalQuarterEnding") or "").strip() or None,
                "market_cap": _to_float(r.get("marketCap")),
            })
        return out

    return _cached(f"cal:{day.isoformat()}", _CALENDAR_TTL, fetch) or []


def _scan_calendar(start: dt.date, window_days: int) -> Dict[str, List[Dict[str, Any]]]:
    """Confirmed reports across the window, indexed by ticker. Days are pulled
    concurrently; a day that fails is simply absent rather than fatal."""
    days = [start + dt.timedelta(days=i) for i in range(window_days + 1)]
    days = [d for d in days if d.weekday() < 5]

    by_ticker: Dict[str, List[Dict[str, Any]]] = {}
    with ThreadPoolExecutor(max_workers=10) as pool:
        for rows in pool.map(_calendar_day, days):
            for row in rows:
                by_ticker.setdefault(row["ticker"], []).append(row)

    for rows in by_ticker.values():
        rows.sort(key=lambda r: r["date"])
    return by_ticker


# ─────────────────────────────────────────────────────────────────────────────
# Feed 2 — Nasdaq per-symbol history and forward consensus
# ─────────────────────────────────────────────────────────────────────────────

def _surprise_history(ticker: str) -> List[Dict[str, Any]]:
    """Last reported quarters, newest first: actual EPS vs consensus."""
    def fetch():
        payload = _get_json(
            f"https://api.nasdaq.com/api/company/{urllib.parse.quote(ticker)}/earnings-surprise",
            NASDAQ_HEADERS,
        )
        if payload is None:
            return None
        rows = (((payload.get("data") or {}).get("earningsSurpriseTable")) or {}).get("rows") or []
        out = []
        for r in rows:
            reported = _parse_us_date(r.get("dateReported"))
            if not reported:
                continue
            eps = _to_float(r.get("eps"))
            consensus = _to_float(r.get("consensusForecast"))
            surprise = _to_float(r.get("percentageSurprise"))
            if surprise is None and eps is not None and consensus:
                surprise = round((eps - consensus) / abs(consensus) * 100, 2)

            if surprise is None or eps is None or consensus is None:
                result = "Unknown"
            elif abs(eps - consensus) < 1e-9:
                result = "In line"
            else:
                result = "Beat" if eps > consensus else "Miss"

            out.append({
                "fiscal_quarter": (r.get("fiscalQtrEnd") or "").strip() or None,
                "date": reported.isoformat(),
                "eps": eps,
                "consensus": consensus,
                "surprise_pct": surprise,
                "result": result,
            })
        out.sort(key=lambda r: r["date"], reverse=True)
        return out

    return _cached(f"surprise:{ticker}", _SURPRISE_TTL, fetch) or []


def _forward_consensus(ticker: str) -> Optional[Dict[str, Any]]:
    """What the street expects for the quarter *not yet reported*. The calendar
    only carries this inside its few-week horizon, so for a projected date this
    is the only place a consensus number comes from."""
    def fetch():
        payload = _get_json(
            f"https://api.nasdaq.com/api/quote/{urllib.parse.quote(ticker)}/eps",
            NASDAQ_HEADERS,
        )
        if payload is None:
            return None
        rows = ((payload.get("data") or {}).get("earningsPerShare")) or []
        upcoming = [r for r in rows if (r.get("type") or "").lower().startswith("upcoming")]
        if not upcoming:
            return {}
        first = upcoming[0]
        return {
            "period": (first.get("period") or "").strip() or None,
            "consensus_eps": _to_float(first.get("consensus")),
        }

    return _cached(f"eps:{ticker}", _SURPRISE_TTL, fetch)


# ─────────────────────────────────────────────────────────────────────────────
# Feed 3 — SEC EDGAR, the fallback date history
# ─────────────────────────────────────────────────────────────────────────────

def _sec_report_dates(ticker: str) -> List[str]:
    """Dates this company filed an 8-K carrying item 2.02, newest first.

    Item 2.02 is 'Results of Operations and Financial Condition' — the form a
    company files when it announces a quarter. A few issuers (Tesla, most
    notably) also use it for interim operating updates, so these dates are
    coarser than the Nasdaq history and are only consulted when that is gone.
    """
    company = get_company_by_ticker(ticker)
    if not company:
        return []

    def fetch():
        cik = str(company["cik_str"]).zfill(10)
        payload = _sec_get_json(f"https://data.sec.gov/submissions/CIK{cik}.json", timeout=8)
        if not payload:
            return None
        recent = ((payload.get("filings") or {}).get("recent")) or {}
        forms = recent.get("form") or []
        dates = recent.get("filingDate") or []
        items = recent.get("items") or []
        out = [
            d for f, d, i in zip(forms, dates, items)
            if f == "8-K" and "2.02" in (i or "")
        ]
        out.sort(reverse=True)
        return out

    return _cached(f"sec8k:{ticker}", _SURPRISE_TTL, fetch) or []


# ─────────────────────────────────────────────────────────────────────────────
# Projection
# ─────────────────────────────────────────────────────────────────────────────

def _project_next_date(report_dates: List[dt.date], today: dt.date) -> Optional[dt.date]:
    """Estimate the next report date from the reporting rhythm.

    Companies schedule against the prior year's calendar, not against a fixed
    day count — so the best anchor is the same fiscal quarter twelve months
    earlier, advanced 364 days (52 weeks, which preserves the weekday). Falls
    back to the median gap between recent reports when there is not yet a full
    year of history.
    """
    if not report_dates:
        return None

    ordered = sorted(report_dates, reverse=True)
    last = ordered[0]

    if len(ordered) >= 4:
        candidate = ordered[3] + dt.timedelta(days=364)
        # Trust the year-ago anchor only if it lands after the last report and
        # is still ahead of us. An off-cycle 8-K in the history can drag it
        # backwards, and a company that has fallen behind its own schedule can
        # put it in the past — both fall through to the gap estimate below.
        if candidate > last and candidate >= today:
            return _nearest_weekday(candidate)

    if len(ordered) >= 2:
        gaps = [(ordered[i] - ordered[i + 1]).days for i in range(min(3, len(ordered) - 1))]
        gaps = [g for g in gaps if 60 <= g <= 120]
        gap = sorted(gaps)[len(gaps) // 2] if gaps else 91
    else:
        gap = 91

    candidate = last + dt.timedelta(days=gap)
    while candidate < today:
        candidate += dt.timedelta(days=gap)
    return _nearest_weekday(candidate)


# ─────────────────────────────────────────────────────────────────────────────
# Price context
# ─────────────────────────────────────────────────────────────────────────────

def _price_context(ticker: str, last_report: Optional[dt.date]) -> Dict[str, Any]:
    """Where the stock is now, and how it took the last report.

    The reaction is measured close-before to close-after, spanning the
    announcement. That covers both a pre-market release (which moves the same
    session) and an after-close one (which moves the next), so it stays
    meaningful without knowing which the company used.
    """
    out: Dict[str, Any] = {
        "last": None, "day_change_pct": None, "currency": "USD",
        "reaction_pct": None, "reaction_window": None,
    }
    try:
        series = fetch_price_history(ticker, "6mo")
    except (PriceUnavailable, Exception) as e:
        logger.info(f"No price context for {ticker}: {e}")
        return out

    points = series.get("points") or []
    if len(points) < 2:
        return out

    out["currency"] = series.get("currency", "USD")
    out["last"] = series.get("market_price") or points[-1]["c"]
    prev, latest = points[-2]["c"], points[-1]["c"]
    if prev:
        out["day_change_pct"] = round((latest - prev) / prev * 100, 2)

    if last_report:
        dated = [(dt.date.fromtimestamp(p["t"] / 1000), p["c"]) for p in points]
        idx = next((i for i, (d, _) in enumerate(dated) if d >= last_report), None)
        # Need a session on each side of the announcement to bracket it.
        if idx is not None and idx >= 1 and idx + 1 < len(dated):
            before, after = dated[idx - 1], dated[idx + 1]
            if before[1]:
                out["reaction_pct"] = round((after[1] - before[1]) / before[1] * 100, 2)
                out["reaction_window"] = f"{before[0].isoformat()} to {after[0].isoformat()}"

    return out


# ─────────────────────────────────────────────────────────────────────────────
# Assembly
# ─────────────────────────────────────────────────────────────────────────────

def _ticker_facts(ticker: str) -> Dict[str, Any]:
    """Everything about one company that does not depend on the calendar scan.

    Kept as a single unit of work so it can run alongside the scan rather than
    after it — the scan is the long pole, and waiting for it before touching
    the per-company feeds roughly doubled the cold load.
    """
    history = _surprise_history(ticker)
    history_dates: List[dt.date] = []
    for h in history:
        try:
            history_dates.append(dt.date.fromisoformat(h["date"]))
        except ValueError:
            continue

    if not history_dates:
        # Nasdaq is down or does not cover this symbol — fall back to the
        # regulatory record of when it announced.
        for ds in _sec_report_dates(ticker)[:8]:
            try:
                history_dates.append(dt.date.fromisoformat(ds))
            except ValueError:
                continue

    last_report_date = history_dates[0] if history_dates else None
    return {
        "history": history,
        "history_dates": history_dates,
        "forward": _forward_consensus(ticker) or {},
        "price": _price_context(ticker, last_report_date),
    }


def _build_event(
    ticker: str,
    facts: Dict[str, Any],
    confirmed_rows: List[Dict[str, Any]],
    today: dt.date,
) -> Dict[str, Any]:
    """Merge one company's own history with whatever the calendar confirmed.
    Pure assembly — every network call already happened in `_ticker_facts`."""
    company = get_company_by_ticker(ticker)
    company_name = (company or {}).get("title") or ticker

    history: List[Dict[str, Any]] = facts["history"]
    history_dates: List[dt.date] = facts["history_dates"]

    # A confirmed row always wins over a projection.
    upcoming = next((r for r in confirmed_rows if r["date"] >= today.isoformat()), None)
    if upcoming:
        date = dt.date.fromisoformat(upcoming["date"])
        confirmed = True
        timing = upcoming["timing"]
        consensus_eps = upcoming["consensus_eps"]
        num_estimates = upcoming["num_estimates"]
        fiscal_quarter = upcoming["fiscal_quarter"]
        if upcoming["company_name"]:
            company_name = upcoming["company_name"]
    else:
        date = _project_next_date(history_dates, today)
        confirmed = False
        timing = "unspecified"
        forward = facts["forward"]
        consensus_eps = forward.get("consensus_eps")
        num_estimates = 0
        fiscal_quarter = forward.get("period")

    if date is None:
        raise ValueError("no reporting history to schedule from")

    price = facts["price"]
    last_report = dict(history[0]) if history else None
    if last_report is not None:
        last_report["reaction_pct"] = price.get("reaction_pct")
        last_report["reaction_window"] = price.get("reaction_window")

    # How many of the trailing quarters came in ahead of consensus. Quarters
    # with no consensus on file are excluded rather than counted as a miss.
    graded = [h for h in history[:4] if h["result"] in {"Beat", "Miss", "In line"}]
    beats = sum(1 for h in graded if h["result"] == "Beat")

    return {
        "ticker": ticker,
        "company_name": company_name,
        "date": date.isoformat(),
        "confirmed": confirmed,
        "timing": timing,
        "days_away": (date - today).days,
        "fiscal_quarter": fiscal_quarter,
        "consensus_eps": consensus_eps,
        "num_estimates": num_estimates,
        "last_report": last_report,
        "history": history[:4],
        "beats_of_last": {"beats": beats, "of": len(graded)} if graded else None,
        "price": price,
    }


def build_earnings_calendar(
    tickers: List[str],
    window_days: int = DEFAULT_WINDOW_DAYS,
) -> Dict[str, Any]:
    """The whole Radar payload: one event per watchlist ticker, plus the
    notable companies reporting inside the window that are not on it."""
    today = dt.date.today()
    window_days = max(7, min(window_days, MAX_WINDOW_DAYS))

    clean: List[str] = []
    for t in tickers:
        sym = (t or "").strip().upper().lstrip("$")
        if sym and sym not in clean:
            clean.append(sym)
    clean = clean[:MAX_TICKERS]

    # The calendar scan and the per-company feeds are independent, so they run
    # against the same pool and the page waits for whichever finishes last.
    with ThreadPoolExecutor(max_workers=8) as pool:
        scan = pool.submit(_scan_calendar, today, window_days)
        facts = {t: pool.submit(_ticker_facts, t) for t in clean}
        confirmed_by_ticker = scan.result()
        resolved = {}
        for ticker, future in facts.items():
            try:
                resolved[ticker] = future.result()
            except Exception as e:
                logger.info(f"Could not load facts for {ticker}: {e}")

    events: List[Dict[str, Any]] = []
    unscheduled: List[Dict[str, Any]] = []

    for ticker in clean:
        try:
            if ticker not in resolved:
                raise ValueError("company feeds were unreachable")
            events.append(
                _build_event(ticker, resolved[ticker], confirmed_by_ticker.get(ticker, []), today)
            )
        except Exception as e:
            logger.info(f"No earnings schedule for {ticker}: {e}")
            company = get_company_by_ticker(ticker)
            unscheduled.append({
                "ticker": ticker,
                "company_name": (company or {}).get("title") or ticker,
                "reason": (
                    "No reporting history found for this symbol."
                    if company else
                    "Not a symbol SEC EDGAR lists - check the spelling."
                ),
            })

    events.sort(key=lambda e: e["date"])

    # Everything else on the calendar in this window, biggest first. Gives the
    # tab something worth reading when the watchlist itself is quiet, and a
    # one-click way to start watching a name that is about to report.
    watched = set(clean)
    others = [
        row
        for rows in confirmed_by_ticker.values()
        for row in rows
        if row["ticker"] not in watched and row["date"] >= today.isoformat()
    ]
    others.sort(key=lambda r: (-(r.get("market_cap") or 0), r["date"]))

    return {
        "as_of": dt.datetime.now().isoformat(timespec="seconds"),
        "today": today.isoformat(),
        "window_days": window_days,
        "events": events,
        "unscheduled": unscheduled,
        "also_reporting": others[:12],
        "confirmed_count": sum(1 for e in events if e["confirmed"]),
    }
