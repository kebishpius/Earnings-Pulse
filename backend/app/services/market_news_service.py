"""
Retrieval of recent online articles about a company.

Used as the second evidence source (alongside SEC earnings filings) for the
Nemotron sentiment + confidence assessment on the Earnings tab. Both feeds are
public RSS endpoints, so no API key is required.
"""

import gzip
import logging
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

HTTP_HEADERS = {
    "User-Agent": "EarningsPulse research@earningspulse.ai",
    "Accept-Encoding": "gzip, deflate",
}

_ARTICLE_CACHE: Dict[str, Dict[str, Any]] = {}
_ARTICLE_CACHE_TTL = 300  # 5 minutes, matching the EDGAR feed cache


def _http_get(url: str, timeout: int = 8) -> Optional[str]:
    try:
        req = urllib.request.Request(url, headers=HTTP_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            body = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
            return body.decode("utf-8", errors="replace")
    except Exception as e:
        logger.warning(f"Article feed request failed for {url}: {e}")
        return None


def _strip_html(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"<[^>]*>", " ", text)
    cleaned = re.sub(r"&[a-zA-Z#0-9]+;", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _parse_rss_items(xml_text: str, default_publisher: str) -> List[Dict[str, str]]:
    """Parses a standard RSS 2.0 channel into article dicts."""
    articles: List[Dict[str, str]] = []
    try:
        root = ET.fromstring(xml_text)
    except Exception as e:
        logger.warning(f"Could not parse article RSS: {e}")
        return articles

    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        if not title:
            continue

        link = (item.findtext("link") or "").strip()
        published = (item.findtext("pubDate") or "").strip()
        summary = _strip_html(item.findtext("description") or "")

        # Google News wraps the publisher in a <source> element; Yahoo does not.
        source_el = item.find("source")
        publisher = (source_el.text or "").strip() if source_el is not None and source_el.text else default_publisher

        # Google News titles are formatted "Headline - Publisher"
        if publisher == default_publisher == "Google News" and " - " in title:
            head, _, tail = title.rpartition(" - ")
            if head and len(tail) < 40:
                title, publisher = head.strip(), tail.strip()

        articles.append({
            "title": title,
            "publisher": publisher or default_publisher,
            "published": published,
            "url": link,
            "summary": summary[:400],
        })

    return articles


def fetch_company_articles(
    ticker: str = "",
    company_name: str = "",
    query: str = "",
    limit: int = 8
) -> List[Dict[str, str]]:
    """
    Returns recent online articles about a company, newest first.

    Pulls Yahoo Finance's per-ticker headline feed first (tightly scoped to the
    security), then tops up from Google News so companies without Yahoo coverage
    still get article evidence. Returns [] rather than raising — the caller
    degrades to filings-only evidence.
    """
    ticker = (ticker or "").strip().upper()
    company_name = (company_name or "").strip()
    search_term = company_name or query or ticker
    if not ticker and not search_term:
        return []

    cache_key = f"{ticker}|{search_term.lower()}|{limit}"
    cached = _ARTICLE_CACHE.get(cache_key)
    if cached and time.time() - cached["ts"] < _ARTICLE_CACHE_TTL:
        return cached["data"]

    articles: List[Dict[str, str]] = []

    if ticker:
        yahoo_url = (
            "https://feeds.finance.yahoo.com/rss/2.0/headline"
            f"?s={urllib.parse.quote(ticker)}&region=US&lang=en-US"
        )
        body = _http_get(yahoo_url)
        if body:
            articles.extend(_parse_rss_items(body, "Yahoo Finance"))

    if len(articles) < limit and search_term:
        news_query = f"{search_term} earnings OR revenue OR guidance"
        google_url = (
            "https://news.google.com/rss/search"
            f"?q={urllib.parse.quote(news_query)}&hl=en-US&gl=US&ceid=US:en"
        )
        body = _http_get(google_url)
        if body:
            articles.extend(_parse_rss_items(body, "Google News"))

    # De-duplicate on normalized headline, keeping first (most specific) occurrence
    deduped: List[Dict[str, str]] = []
    seen = set()
    for a in articles:
        key = re.sub(r"[^a-z0-9]", "", a["title"].lower())[:80]
        if key and key not in seen:
            seen.add(key)
            deduped.append(a)

    result = deduped[:limit]
    _ARTICLE_CACHE[cache_key] = {"ts": time.time(), "data": result}
    logger.info(f"Retrieved {len(result)} online articles for '{ticker or search_term}'")
    return result


def format_articles_for_prompt(articles: List[Dict[str, str]]) -> str:
    """Renders articles as a numbered block for an LLM prompt."""
    if not articles:
        return "No recent online articles could be retrieved for this company."

    lines = []
    for idx, a in enumerate(articles, start=1):
        line = f"[Article {idx}] {a['title']} — {a.get('publisher', 'Unknown outlet')}"
        if a.get("published"):
            line += f" ({a['published']})"
        if a.get("summary"):
            line += f"\n    Summary: {a['summary']}"
        lines.append(line)
    return "\n".join(lines)
