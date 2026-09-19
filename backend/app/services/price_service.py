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
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional

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

# query1 and query2 are separate edges of the same service. They throttle
# independently, so a 429/401 on one is often served fine by the other.
CHART_HOSTS = ("query1.finance.yahoo.com", "query2.finance.yahoo.com")
SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"

_PRICE_CACHE: Dict[str, Dict[str, Any]] = {}
_PRICE_CACHE_TTL = 120  # 2 minutes — live enough for a chart, kind to the upstream


class PriceUnavailable(Exception):
    """
    Raised when no usable price series could be retrieved for a ticker.

    `status` is the HTTP status the API should answer with: 404 when the symbol
    simply has no series, 503 when the upstream is throttling and the same
    request is worth repeating.
    """

    def __init__(self, message: str, status: int = 404):
        super().__init__(message)
        self.status = status


class _UpstreamRefused(Exception):
    """Upstream answered, but not with data: 404 unknown symbol, 401/429 throttle."""

    def __init__(self, status: int):
        super().__init__(f"upstream returned {status}")
        self.status = status


def normalize_ticker(ticker: str) -> str:
    """
    Map a ticker as it appears in filings onto the symbol form the feed uses:
    strip the '$' cashtag prefix, and write share classes with a dash
    (BRK.B -> BRK-B), which is the only form the chart endpoint resolves.
    """
    symbol = (ticker or "").strip().upper().lstrip("$").strip()
    return symbol.replace(".", "-")


def _get_json(url: str, timeout: int = 10) -> Dict[str, Any]:
    req = urllib.request.Request(url, headers=HTTP_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    body = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
    return json.loads(body.decode("utf-8", errors="replace"))


def _fetch_chart(symbol: str, cfg: Dict[str, str]) -> Dict[str, Any]:
    """
    Pull the raw chart payload, trying each host in turn.

    A 404 means the feed does not carry that symbol and is not worth a second
    host; anything else (throttling, a blocked edge, a timeout) gets retried
    against the other host before giving up.
    """
    last_status: Optional[int] = None
    last_network_error: Optional[Exception] = None

    for host in CHART_HOSTS:
        url = (
            f"https://{host}/v8/finance/chart/{urllib.parse.quote(symbol)}"
            f"?range={cfg['range']}&interval={cfg['interval']}"
        )
        try:
            return _get_json(url)
        except urllib.error.HTTPError as e:
            last_status = e.code
            logger.warning(f"Price feed {host} returned {e.code} for {symbol} ({cfg['range']})")
            if e.code == 404:
                break
        except Exception as e:
            last_network_error = e
            logger.warning(f"Price feed {host} unreachable for {symbol} ({cfg['range']}): {e}")

    if last_status is not None:
        raise _UpstreamRefused(last_status)
    raise PriceUnavailable(
        f"Could not reach the price feed for {symbol}.", status=503
    ) from last_network_error


def _resolve_symbol(query: str) -> Optional[str]:
    """
    Second chance for a symbol the feed rejected. Upstream analysis can hand us
    something that is not a tradable symbol — a truncated company name from a
    fallback dossier, or a class of share the feed lists differently — so ask
    the feed's own search which equity that text means.
    """
    url = f"{SEARCH_URL}?q={urllib.parse.quote(query)}&quotesCount=6&newsCount=0"
    try:
        payload = _get_json(url)
    except Exception as e:
        logger.warning(f"Symbol lookup failed for '{query}': {e}")
        return None

    for quote in payload.get("quotes") or []:
        if quote.get("quoteType") == "EQUITY" and quote.get("symbol"):
            return quote["symbol"]
    return None


def fetch_price_history(ticker: str, range_key: str = "1mo") -> Dict[str, Any]:
    requested = (ticker or "").strip()
    symbol = normalize_ticker(requested)
    if not symbol:
        raise PriceUnavailable("A ticker symbol is required.")

    cfg = RANGE_CONFIG.get(range_key)
    if not cfg:
        raise PriceUnavailable(f"Unsupported range '{range_key}'.")

    cache_key = f"{symbol}|{range_key}"
    cached = _PRICE_CACHE.get(cache_key)
    if cached and time.time() - cached["ts"] < _PRICE_CACHE_TTL:
        return cached["data"]

    try:
        payload = _fetch_chart(symbol, cfg)
    except _UpstreamRefused as refused:
        if refused.status != 404:
            raise PriceUnavailable(
                f"The price feed is temporarily refusing requests for {symbol}. Try again in a moment.",
                status=503,
            )

        # Not a symbol the feed carries. Ask it what the text means before
        # surfacing a dead chart — the ticker may be a company name or a
        # differently listed share class.
        resolved = _resolve_symbol(requested or symbol)
        if not resolved or normalize_ticker(resolved) == symbol:
            raise PriceUnavailable(f"'{requested or symbol}' is not a symbol the price feed recognizes.")

        logger.info(f"Resolved unrecognized ticker '{symbol}' to '{resolved}'")
        symbol = resolved
        try:
            payload = _fetch_chart(symbol, cfg)
        except _UpstreamRefused:
            raise PriceUnavailable(f"'{requested}' is not a symbol the price feed recognizes.")

    chart = payload.get("chart") or {}
    if chart.get("error"):
        raise PriceUnavailable(f"No price data published for {symbol}.")

    results = chart.get("result") or []
    if not results:
        raise PriceUnavailable(f"No price data published for {symbol}.")

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
        raise PriceUnavailable(f"Not enough price history for {symbol} over {cfg['label']}.")

    first_close = points[0]["c"]
    last_close = points[-1]["c"]
    change = last_close - first_close
    closes_only = [p["c"] for p in points]

    data = {
        "ticker": meta.get("symbol", symbol),
        # Set only when the requested ticker was not itself tradable and had to
        # be resolved, so the chart can say whose prices these actually are.
        "resolved_from": requested.upper() if normalize_ticker(requested) != normalize_ticker(symbol) else None,
        "name": meta.get("shortName") or meta.get("longName"),
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
    logger.info(f"Price history for {symbol} ({range_key}): {len(points)} points")
    return data
