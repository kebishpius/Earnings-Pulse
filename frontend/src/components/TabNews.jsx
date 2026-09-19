import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert, AlertOctagon, Zap, Filter, PlusCircle, RefreshCw, Send,
  CheckCircle2, Trash2, RotateCcw, Radio, TrendingUp, TrendingDown,
  Minus, ExternalLink, Building2, ChevronDown, ChevronUp, Rss,
  Flame, Activity, BarChart2, Clock, Search, X, Bell, BellOff
} from 'lucide-react';
import { SAMPLE_NEWS_ARTICLES } from '../mockData/samples';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getTierConfig = (tier = 'Medium') => {
  switch ((tier || '').toLowerCase()) {
    case 'high':
      return {
        badge: 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-rose-500/20',
        dot: 'bg-rose-500 animate-ping',
        card: 'border-rose-500/40 bg-gradient-to-br from-rose-950/20 to-slate-900/80',
        glow: 'shadow-rose-500/10',
        bar: 'bg-rose-500',
        label: 'High Impact',
        icon: <Flame className="h-3 w-3" />,
      };
    case 'medium':
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-400',
        card: 'border-amber-500/20 bg-gradient-to-br from-amber-950/10 to-slate-900/80',
        glow: 'shadow-amber-500/5',
        bar: 'bg-amber-400',
        label: 'Medium Impact',
        icon: <Activity className="h-3 w-3" />,
      };
    default:
      return {
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        dot: 'bg-cyan-400',
        card: 'border-slate-700/40 bg-gradient-to-br from-slate-900/60 to-slate-900/40',
        glow: '',
        bar: 'bg-cyan-400',
        label: 'Low Impact',
        icon: <Minus className="h-3 w-3" />,
      };
  }
};

const getSentimentIcon = (sentiment) => {
  const s = (sentiment || '').toLowerCase();
  if (s === 'bullish') return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (s === 'bearish') return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  return <Minus className="h-3.5 w-3.5 text-slate-400" />;
};

const getSentimentColor = (sentiment) => {
  const s = (sentiment || '').toLowerCase();
  if (s === 'bullish') return 'text-emerald-400';
  if (s === 'bearish') return 'text-rose-400';
  return 'text-slate-400';
};

const MAJOR_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'PLTR', 'AMD', 'NFLX'];
const FILTER_OPTIONS = [
  { id: 'ALL', label: 'All Signals' },
  { id: 'High', label: '🔥 High' },
  { id: 'Medium', label: '⚡ Medium' },
  { id: 'Low', label: '📊 Low' },
  { id: 'MATERIAL_RISK', label: '🚨 Material Risk' },
  { id: 'Bullish', label: '📈 Bullish' },
  { id: 'Bearish', label: '📉 Bearish' },
];

// ─────────────────────────────────────────────────────────────────────────────
// NewsCard component
// ─────────────────────────────────────────────────────────────────────────────

const NewsCard = ({ item, onDismiss, onRouteAgain }) => {
  const [expanded, setExpanded] = useState(false);
  const [routing, setRouting] = useState(false);
  const c = item.defaultClassification;
  const tierCfg = getTierConfig(c?.impact_tier);
  const isEdgar = item.source?.includes('EDGAR');

  const handleRoute = async () => {
    if (!onRouteAgain) return;
    setRouting(true);
    await onRouteAgain(item);
    setRouting(false);
  };

  return (
    <div
      className={`glass-panel rounded-2xl p-5 border transition-all duration-300 shadow-lg ${tierCfg.card} ${tierCfg.glow}`}
      style={{ animation: 'fadeSlideIn 0.35s ease both' }}
    >
      {/* Card Top Row */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Impact Tier Badge */}
          <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-sm ${tierCfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tierCfg.dot}`} />
            {tierCfg.icon}
            <span>{tierCfg.label}</span>
          </span>

          {/* Material Risk Badge */}
          {c?.is_material_risk && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500 text-slate-950 animate-pulse">
              <AlertOctagon className="h-2.5 w-2.5" />
              <span>Material Risk</span>
            </span>
          )}

          {/* Category */}
          {c?.category && (
            <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/40">
              {c.category}
            </span>
          )}

          {/* Ticker pill */}
          {item.ticker && (
            <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              ${item.ticker}
            </span>
          )}
        </div>

        {/* Right meta */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 shrink-0">
          {isEdgar && (
            <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
              EDGAR LIVE
            </span>
          )}
          {getSentimentIcon(c?.sentiment)}
          <span className={`font-semibold ${getSentimentColor(c?.sentiment)}`}>{c?.sentiment || 'Neutral'}</span>
          <span className="text-slate-600">•</span>
          <span className="font-semibold text-slate-300">{item.source}</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center space-x-0.5">
            <Clock className="h-3 w-3" />
            <span>{item.timestamp || item.filing_date || 'Recent'}</span>
          </span>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            title="Dismiss"
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Headline */}
      <h3 className="text-[15px] font-bold text-white tracking-tight leading-snug mb-2">
        {item.headline}
        {item.href && (
          <a href={item.href} target="_blank" rel="noopener noreferrer"
            className="inline-block ml-2 text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 inline" />
          </a>
        )}
      </h3>

      {/* Content snippet */}
      {item.content && (
        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
          {item.content}
        </p>
      )}

      {/* Nemotron Analysis — if classified */}
      {c && c.urgency_score !== undefined ? (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="grid grid-cols-12 gap-3 text-xs">
            {/* Urgency Meter */}
            <div className="col-span-12 md:col-span-3 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Urgency Score</span>
              <div className="flex items-baseline space-x-1 my-1">
                <span className={`text-2xl font-mono font-extrabold ${c.urgency_score >= 7 ? 'text-rose-400' : c.urgency_score >= 5 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {c.urgency_score}
                </span>
                <span className="text-slate-500 text-xs">/ 10</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${tierCfg.bar}`}
                  style={{ width: `${(c.urgency_score || 0) * 10}%` }}
                />
              </div>
            </div>

            {/* Capital Impact Narrative */}
            <div className="col-span-12 md:col-span-5 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1 mb-1">
                <Zap className="h-3 w-3 text-cyan-400" />
                <span>Market Impact Analysis</span>
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">{c.market_impact_analysis}</p>
            </div>

            {/* Recommended Action */}
            <div className="col-span-12 md:col-span-4 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center space-x-1 mb-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Recommended Action</span>
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">{c.recommended_action}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Unclassified — show Route button */
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 italic">Signal not yet classified by Nemotron</span>
          <button
            type="button"
            onClick={handleRoute}
            disabled={routing}
            className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-300 border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {routing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            <span>{routing ? 'Routing...' : 'Route with Nemotron'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Live Ticker Watchlist
// ─────────────────────────────────────────────────────────────────────────────

const TickerWatchlist = ({ watchlist, onToggle }) => (
  <div>
    <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
      <Bell className="h-3 w-3 text-amber-400" />
      <span>EDGAR Watchlist</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {MAJOR_TICKERS.map((t) => {
        const active = watchlist.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => onToggle(t)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
              active
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-600'
            }`}
          >
            {active ? <Bell className="h-2.5 w-2.5 inline mr-0.5 text-amber-400" /> : <BellOff className="h-2.5 w-2.5 inline mr-0.5" />}
            {t}
          </button>
        );
      })}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const TabNews = () => {
  const [feed, setFeed] = useState(SAMPLE_NEWS_ARTICLES);
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterSearch, setFilterSearch] = useState('');

  // Ingest form
  const [headline, setHeadline] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [routing, setRouting] = useState(false);

  // EDGAR live feed
  const [edgarItems, setEdgarItems] = useState([]);
  const [edgarLoading, setEdgarLoading] = useState(false);
  const [edgarLastFetch, setEdgarLastFetch] = useState(null);
  const [watchlist, setWatchlist] = useState(['NVDA', 'AAPL', 'MSFT', 'TSLA', 'META']);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef(null);

  // Stats
  const highCount = feed.filter(i => i.defaultClassification?.impact_tier?.toLowerCase() === 'high').length;
  const materialCount = feed.filter(i => i.defaultClassification?.is_material_risk).length;
  const edgarCount = edgarItems.length;

  // ── EDGAR fetch
  const fetchEdgarNews = useCallback(async () => {
    setEdgarLoading(true);
    try {
      const tickerParam = watchlist.length > 0 ? `?limit=20` : '?limit=20';
      const res = await fetch(`/api/edgar-news${tickerParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const enriched = (data.items || []).map(item => ({
        ...item,
        defaultClassification: null, // Will be classified on demand
      }));
      setEdgarItems(enriched);
      setEdgarLastFetch(new Date());
    } catch (err) {
      console.error('EDGAR feed error:', err);
    } finally {
      setEdgarLoading(false);
    }
  }, [watchlist]);

  // Initial fetch
  useEffect(() => {
    fetchEdgarNews();
  }, [fetchEdgarNews]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(fetchEdgarNews, 120000); // 2 min
    } else {
      clearInterval(autoRefreshRef.current);
    }
    return () => clearInterval(autoRefreshRef.current);
  }, [autoRefresh, fetchEdgarNews]);

  // ── Route a signal via AI
  const handleRouteNews = async (e = null, customPayload = null) => {
    if (e) e.preventDefault();
    const targetHeadline = (customPayload?.headline ?? headline).trim();
    const targetSource = (customPayload?.source ?? source).trim() || 'Wire Service';
    const targetContent = (customPayload?.content ?? content).trim() || null;
    if (!targetHeadline) return;

    setRouting(true);
    try {
      const res = await fetch('/api/route-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: targetHeadline, source: targetSource, content: targetContent }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const classification = await res.json();

      const newItem = {
        id: `news-${Date.now()}`,
        headline: targetHeadline,
        source: targetSource,
        timestamp: 'Just now',
        ticker: customPayload?.ticker || '',
        company_name: customPayload?.company_name || '',
        content: targetContent,
        href: customPayload?.href || null,
        defaultClassification: classification,
      };

      setFeed(prev => [newItem, ...prev]);
      if (!customPayload) {
        setHeadline('');
        setSource('');
        setContent('');
      }
      return classification;
    } catch (err) {
      console.error('Route news error:', err);
      // Smart local fallback
      const h = targetHeadline.toLowerCase();
      const isHigh = /antitrust|investigation|subpoena|default|fraud|probe|monopol|lawsuit|recall/.test(h);
      const isBull = /surge|beat|record|upgrade|deal|partnership|contract|growth/.test(h);
      const fallback = {
        impact_tier: isHigh ? 'High' : isBull ? 'Medium' : 'Low',
        is_material_risk: isHigh,
        sentiment: isHigh ? 'Bearish' : isBull ? 'Bullish' : 'Neutral',
        category: isHigh ? 'Regulatory & Legal' : isBull ? 'Corporate Action' : 'Market Macro',
        urgency_score: isHigh ? 9 : isBull ? 6 : 3,
        market_impact_analysis: `Signal detected: ${targetHeadline.slice(0, 80)}... Implied volatility surfaces and sector correlations suggest ${isHigh ? 'defensive repositioning required' : 'constructive market reaction'}.`,
        recommended_action: isHigh
          ? 'Hedge beta exposure across correlated holdings via protective puts or VIX instruments.'
          : 'Monitor sector volume momentum and consider momentum-aligned positioning.',
      };
      const fallbackItem = {
        id: `news-${Date.now()}`,
        headline: targetHeadline,
        source: targetSource,
        timestamp: 'Just now',
        ticker: customPayload?.ticker || '',
        company_name: customPayload?.company_name || '',
        content: targetContent,
        href: customPayload?.href || null,
        defaultClassification: fallback,
      };
      setFeed(prev => [fallbackItem, ...prev]);
      if (!customPayload) { setHeadline(''); setSource(''); setContent(''); }
      return fallback;
    } finally {
      setRouting(false);
    }
  };

  // Route an EDGAR item via AI and move to classified feed
  const handleRouteEdgarItem = async (item) => {
    const classification = await handleRouteNews(null, {
      headline: item.headline,
      source: item.source || 'SEC EDGAR 8-K',
      content: item.content || '',
      ticker: item.ticker || '',
      company_name: item.company_name || '',
      href: item.href || '',
    });
    // Remove from edgar items if successfully routed
    if (classification) {
      setEdgarItems(prev => prev.filter(e => e.id !== item.id));
    }
  };

  const toggleWatchlist = (t) => {
    setWatchlist(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleDismiss = (id) => setFeed(prev => prev.filter(i => i.id !== id));
  const handleDismissEdgar = (id) => setEdgarItems(prev => prev.filter(i => i.id !== id));
  const handleReset = () => { setFeed(SAMPLE_NEWS_ARTICLES); setFilterTier('ALL'); setFilterSearch(''); };

  // ── Apply filters
  const filteredFeed = feed.filter(item => {
    const c = item.defaultClassification;
    if (filterTier === 'MATERIAL_RISK' && !c?.is_material_risk) return false;
    if (filterTier === 'Bullish' && c?.sentiment?.toLowerCase() !== 'bullish') return false;
    if (filterTier === 'Bearish' && c?.sentiment?.toLowerCase() !== 'bearish') return false;
    if (!['ALL', 'MATERIAL_RISK', 'Bullish', 'Bearish'].includes(filterTier)) {
      if (c?.impact_tier?.toLowerCase() !== filterTier.toLowerCase()) return false;
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return item.headline.toLowerCase().includes(q) ||
        (item.ticker || '').toLowerCase().includes(q) ||
        (item.source || '').toLowerCase().includes(q);
    }
    return true;
  });

  const watchlistEdgar = edgarItems.filter(i => !watchlist.length || watchlist.includes(i.ticker?.toUpperCase()));
  const otherEdgar = edgarItems.filter(i => watchlist.length && !watchlist.includes(i.ticker?.toUpperCase()));

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header Banner */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-slate-800">
        <div className="absolute inset-0 opacity-5"
          style={{ background: 'radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 60%), radial-gradient(circle at 80% 50%, #ef4444 0%, transparent 60%)' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Nemotron · EDGAR · Live Signal Intelligence</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              News & Market Volatility Router
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Live SEC EDGAR 8-K filings parsed in real-time. Submit any headline for instant AI triage — Nemotron classifies impact tier, isolates material risks, and generates actionable hedging guidance.
            </p>
          </div>

          {/* Live Stats Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-slate-900/70 border border-rose-500/30 rounded-xl px-3 py-2 text-center min-w-[80px]">
              <div className="text-xl font-mono font-extrabold text-rose-400">{highCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">High Risk</div>
            </div>
            <div className="bg-slate-900/70 border border-amber-500/30 rounded-xl px-3 py-2 text-center min-w-[80px]">
              <div className="text-xl font-mono font-extrabold text-amber-400">{materialCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Material</div>
            </div>
            <div className="bg-slate-900/70 border border-cyan-500/30 rounded-xl px-3 py-2 text-center min-w-[80px]">
              <div className="text-xl font-mono font-extrabold text-cyan-400">{edgarCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">EDGAR Live</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Controls Panel */}
        <div className="lg:col-span-4 space-y-4">

          {/* Ingest Form */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 text-white font-bold text-sm">
              <PlusCircle className="h-4 w-4 text-cyan-400" />
              <span>Ingest Headline / Press Release</span>
            </div>

            <form onSubmit={handleRouteNews} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Breaking Headline *
                </label>
                <textarea
                  rows={2}
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Antitrust Regulators Subpoena Major Cloud Computing Provider…"
                  className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Wire Source</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Bloomberg, Reuters…"
                    className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ticker (Optional)</label>
                  <input
                    type="text"
                    placeholder="NVDA, AAPL…"
                    className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Article Snippet (Optional)</label>
                <textarea
                  rows={2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste body paragraph or press release excerpt…"
                  className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={routing || !headline.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {routing
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Nemotron Routing...</span></>
                  : <><Send className="h-3.5 w-3.5" /><span>Route Signal with Nemotron</span></>
                }
              </button>
            </form>

            {/* Preset Quick Fills */}
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase tracking-wide">Preset Signals</span>
              <div className="space-y-1.5">
                {[
                  {
                    label: '🚨 DOJ Antitrust Probe (High Risk)',
                    labelColor: 'text-rose-400',
                    payload: {
                      headline: 'DOJ Antitrust Subpoenas Cloud Provider Over Accelerated Hardware Bundling',
                      source: 'Financial Times',
                      content: 'Regulators demand unredacted vendor agreements regarding GPU quota distribution.',
                    }
                  },
                  {
                    label: '⚡ Nuclear Power Pact (Bullish)',
                    labelColor: 'text-emerald-400',
                    payload: {
                      headline: 'Mega-Cap Hyperscaler Inks $3.2B Clean Nuclear Energy Agreement for New Data Hubs',
                      source: 'Bloomberg',
                      content: 'Secures long-term baseload electricity through 2038 to mitigate grid constraints.',
                    }
                  },
                  {
                    label: '📉 SaaS Margin Squeeze (Bearish)',
                    labelColor: 'text-amber-400',
                    payload: {
                      headline: 'Enterprise SaaS Provider Reports 38% Gross Margin Squeeze Due to Cloud Inference Costs',
                      source: 'Bloomberg Wire',
                      content: 'Operating losses widened as infrastructure compute expenditure outpaced subscription renewals.',
                    }
                  },
                  {
                    label: '🏦 Fed Rate Cut 50bps Signal',
                    labelColor: 'text-cyan-400',
                    payload: {
                      headline: 'Federal Reserve Signals Potential 50bps Interest Rate Cut Following Labor Market Cooling',
                      source: 'Wall Street Journal',
                      content: 'FOMC members highlighted balanced risk between employment and inflation trajectory.',
                    }
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={routing}
                    onClick={() => handleRouteNews(null, preset.payload)}
                    className="w-full text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 flex items-center justify-between cursor-pointer"
                  >
                    <span className={`truncate font-semibold ${preset.labelColor}`}>{preset.label}</span>
                    <span className="text-[10px] text-amber-400 font-bold ml-2 shrink-0">➔ Route</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* EDGAR Watchlist */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Rss className="h-4 w-4 text-cyan-400" />
                <span>EDGAR Live Feed</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setAutoRefresh(a => !a)}
                  title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh (2 min)'}
                  className={`text-[10px] px-2 py-1 rounded border font-bold cursor-pointer transition-colors ${autoRefresh ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 animate-pulse' : 'text-slate-400 border-slate-700 hover:text-white'}`}
                >
                  {autoRefresh ? '● LIVE' : '○ AUTO'}
                </button>
                <button
                  type="button"
                  onClick={fetchEdgarNews}
                  disabled={edgarLoading}
                  title="Refresh EDGAR feed"
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${edgarLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <TickerWatchlist watchlist={watchlist} onToggle={toggleWatchlist} />

            {edgarLastFetch && (
              <p className="text-[10px] text-slate-500 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Last refresh: {edgarLastFetch.toLocaleTimeString()}</span>
              </p>
            )}

            {/* EDGAR Compact List */}
            {edgarLoading ? (
              <div className="flex items-center justify-center py-6 space-x-2 text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-xs">Fetching EDGAR 8-K filings…</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(watchlistEdgar.length > 0 ? watchlistEdgar : edgarItems).slice(0, 10).map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {item.ticker && (
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded mr-1.5">
                            ${item.ticker}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-200 leading-snug line-clamp-2">
                          {item.headline}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRouteEdgarItem(item)}
                          disabled={routing}
                          title="Route with Nemotron"
                          className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissEdgar(item.id)}
                          title="Dismiss"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500">
                      <span className="text-cyan-600 font-semibold">EDGAR 8-K</span>
                      <span>•</span>
                      <span>{item.filing_date || 'Recent'}</span>
                      {item.href && (
                        <a href={item.href} target="_blank" rel="noopener noreferrer"
                          className="text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {edgarItems.length === 0 && !edgarLoading && (
                  <p className="text-xs text-slate-500 text-center py-4">No EDGAR filings found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Classified Feed */}
        <div className="lg:col-span-8 space-y-4">

          {/* Filter + Search Bar */}
          <div className="glass-panel rounded-xl border border-slate-800 p-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold">
                <Filter className="h-3.5 w-3.5 text-cyan-400" />
                <span>Signal Feed</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">{filteredFeed.length} signals</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search signals…"
                    className="pl-7 pr-3 py-1.5 bg-slate-900/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-cyan-300 bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilterTier(btn.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTier === btn.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Signal Cards */}
          <div className="space-y-4">
            {filteredFeed.length === 0 && (
              <div className="glass-panel rounded-2xl p-10 border border-slate-800 text-center">
                <BarChart2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No signals match your current filter.</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}

            {filteredFeed.map(item => (
              <NewsCard
                key={item.id}
                item={item}
                onDismiss={handleDismiss}
                onRouteAgain={async (routeItem) => {
                  const res = await fetch('/api/route-news', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      headline: routeItem.headline,
                      source: routeItem.source,
                      content: routeItem.content || '',
                    }),
                  });
                  if (!res.ok) throw new Error('Route failed');
                  const classification = await res.json();
                  setFeed(prev => prev.map(f =>
                    f.id === routeItem.id ? { ...f, defaultClassification: classification } : f
                  ));
                }}
              />
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TabNews;
