"""
Historical price series for a single ticker.

Backs the interactive price chart on the Earnings tab. Uses Yahoo Finance's
public chart endpoint, which is browser-blocked by CORS, so the request has to
be proxied here rather than made from the client.
"""

import gzip
import json
import logging
import time
import urllib.parse
import urllib.request
from typing import Any, Dict

logger = logging.getLogger(__name__)

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EarningsPulse/1.0; research@earningspulse.ai)",
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate",
}

# Interval per range keeps every window around 20-130 points: dense enough to
# show shape, sparse enough that the SVG path stays light.
RANGE_CONFIG = {
    "7d":  {"range": "7d",  "interval": "60m", "label": "7 days"},
    "1mo": {"range": "1mo", "interval": "1d",  "label": "1 month"},
    "6mo": {"range": "6mo", "interval": "1d",  "label": "6 months"},
    "1y":  {"range": "1y",  "interval": "1wk", "label": "1 year"},
}

_PRICE_CACHE: Dict[str, Dict[str, Any]] = {}
_PRICE_CACHE_TTL = 120  # 2 minutes — live enough for a chart, kind to the upstream


class PriceUnavailable(Exception):
    """Raised when no usable price series could be retrieved for a ticker."""


def fetch_price_history(ticker: str, range_key: str = "1mo") -> Dict[str, Any]:
    ticker = (ticker or "").strip().upper()
    if not ticker:
        raise PriceUnavailable("A ticker symbol is required.")

    cfg = RANGE_CONFIG.get(range_key)
    if not cfg:
        raise PriceUnavailable(f"Unsupported range '{range_key}'.")

    cache_key = f"{ticker}|{range_key}"
    cached = _PRICE_CACHE.get(cache_key)
    if cached and time.time() - cached["ts"] < _PRICE_CACHE_TTL:
        return cached["data"]

    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}"
        f"?range={cfg['range']}&interval={cfg['interval']}"
    )

    try:
        req = urllib.request.Request(url, headers=HTTP_HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
            body = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
            payload = json.loads(body.decode("utf-8", errors="replace"))
    except Exception as e:
        logger.warning(f"Price history request failed for {ticker} ({range_key}): {e}")
        raise PriceUnavailable(f"Could not reach the price feed for {ticker}.")

    chart = payload.get("chart") or {}
    if chart.get("error"):
        raise PriceUnavailable(f"No price data published for {ticker}.")

    results = chart.get("result") or []
    if not results:
        raise PriceUnavailable(f"No price data published for {ticker}.")

    result = results[0]
    meta = result.get("meta") or {}
    timestamps = result.get("timestamp") or []
    quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
    closes = quote.get("close") or []

    points = [
        {"t": int(ts) * 1000, "c": round(float(c), 4)}
        for ts, c in zip(timestamps, closes)
        if c is not None
    ]
    if len(points) < 2:
        raise PriceUnavailable(f"Not enough price history for {ticker} over {cfg['label']}.")

    first_close = points[0]["c"]
    last_close = points[-1]["c"]
    change = last_close - first_close
    closes_only = [p["c"] for p in points]

    data = {
        "ticker": meta.get("symbol", ticker),
        "currency": meta.get("currency", "USD"),
        "exchange": meta.get("fullExchangeName") or meta.get("exchangeName"),
        "range": range_key,
        "range_label": cfg["label"],
        "interval": cfg["interval"],
        "points": points,
        "first": first_close,
        "last": last_close,
        "change": round(change, 4),
        "change_pct": round((change / first_close) * 100, 2) if first_close else 0.0,
        "low": min(closes_only),
        "high": max(closes_only),
        "market_price": meta.get("regularMarketPrice", last_close),
        "market_state": meta.get("marketState"),
        "as_of": int(meta.get("regularMarketTime", points[-1]["t"] // 1000)) * 1000,
    }

    _PRICE_CACHE[cache_key] = {"ts": time.time(), "data": data}
    logger.info(f"Price history for {ticker} ({range_key}): {len(points)} points")
    return data
