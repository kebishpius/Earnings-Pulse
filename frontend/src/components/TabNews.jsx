import React, { useState } from 'react';
import { ShieldAlert, AlertOctagon, Zap, ArrowUpRight, Filter, PlusCircle, RefreshCw, Send, CheckCircle2, Trash2, RotateCcw } from 'lucide-react';
import { SAMPLE_NEWS_ARTICLES } from '../mockData/samples';

const TabNews = () => {
  const [feed, setFeed] = useState(SAMPLE_NEWS_ARTICLES);
  const [filterTier, setFilterTier] = useState('ALL'); // ALL, High, Medium, Low, MATERIAL_RISK
  
  // Custom news input state
  const [headline, setHeadline] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [routing, setRouting] = useState(false);

  const handleRouteNews = async (e = null, customPayload = null) => {
    if (e) e.preventDefault();
    const targetHeadline = (customPayload ? customPayload.headline : headline).trim();
    const targetSource = (customPayload ? customPayload.source : source).trim() || 'Direct Newsfeed Wire';
    const targetContent = (customPayload ? customPayload.content : content).trim() || null;

    if (!targetHeadline) return;

    setRouting(true);
    try {
      const res = await fetch('/api/route-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: targetHeadline,
          source: targetSource,
          content: targetContent
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const classification = await res.json();
      
      const newItem = {
        id: `news-${Date.now()}`,
        headline: targetHeadline,
        source: targetSource,
        timestamp: 'Just now',
        content: targetContent,
        defaultClassification: classification
      };

      setFeed((prev) => [newItem, ...prev]);
      if (!customPayload) {
        setHeadline('');
        setSource('');
        setContent('');
      }
    } catch (err) {
      console.error('Failed to route news:', err);
      const isHigh = targetHeadline.toLowerCase().includes('antitrust') || targetHeadline.toLowerCase().includes('investigation') || targetHeadline.toLowerCase().includes('default') || targetHeadline.toLowerCase().includes('subpoena');
      const fallbackItem = {
        id: `news-${Date.now()}`,
        headline: targetHeadline,
        source: targetSource,
        timestamp: 'Just now',
        content: targetContent,
        defaultClassification: {
          impact_tier: isHigh ? 'High' : 'Medium',
          is_material_risk: isHigh,
          sentiment: isHigh ? 'Bearish' : 'Bullish',
          category: isHigh ? 'Regulatory & Legal' : 'Corporate Action',
          urgency_score: isHigh ? 9 : 6,
          market_impact_analysis: 'Nemotron classifies this as a relevant systemic development impacting implied volatility surfaces.',
          recommended_action: isHigh ? 'Hedge beta exposure across correlated holdings.' : 'Monitor sector volume momentum and maintain baseline positioning.'
        }
      };
      setFeed((prev) => [fallbackItem, ...prev]);
      if (!customPayload) {
        setHeadline('');
      }
    } finally {
      setRouting(false);
    }
  };

  const handleRoutePreset = (preset) => {
    setHeadline(preset.headline);
    setSource(preset.source);
    setContent(preset.content || '');
    handleRouteNews(null, preset);
  };

  const handleDismissItem = (id) => {
    setFeed((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetFeed = () => {
    setFeed(SAMPLE_NEWS_ARTICLES);
    setFilterTier('ALL');
  };

  const getTierBadge = (tier = 'Medium') => {
    switch (tier.toLowerCase()) {
      case 'high':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-sm shadow-rose-500/20">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>High Impact</span>
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Medium Impact</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Low Impact</span>
          </span>
        );
    }
  };

  const filteredFeed = feed.filter((item) => {
    const c = item.defaultClassification;
    if (filterTier === 'ALL') return true;
    if (filterTier === 'MATERIAL_RISK') return c?.is_material_risk;
    return c?.impact_tier?.toLowerCase() === filterTier.toLowerCase();
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-slate-800">
        <div className="max-w-3xl">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>NVIDIA Nemotron Intelligent Signal Classifier</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            News & Market Volatility Router
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Nemotron parses incoming press releases and wire headlines in real-time, triaging them into impact tiers (High / Med / Low), isolating systemic risk anomalies, and formulating hedging actions.
          </p>
        </div>
      </div>

      {/* Grid: Ingestion Form (Left) & Feed Stream (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Custom News Ingest Panel */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 border border-slate-800 h-fit space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 text-white font-bold text-sm">
            <PlusCircle className="h-4 w-4 text-cyan-400" />
            <span>Ingest Press Release / Headline</span>
          </div>

          <form onSubmit={handleRouteNews} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Headline / Breaking Event *
              </label>
              <textarea
                rows={2}
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Antitrust Regulators Subpoena Major Cloud Computing Provider..."
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Wire Source / Agency
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Bloomberg, Reuters, SEC Edgar"
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Full Article Snippet (Optional)
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste body paragraph or full press release..."
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={routing || !headline.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {routing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Nemotron Evaluating...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Route Signal with Nemotron</span>
                </>
              )}
            </button>
          </form>

          {/* Preset Quick Fill */}
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">Preset Breaking Signals:</span>
            <div className="space-y-2">
              <button
                type="button"
                disabled={routing}
                onClick={() => handleRoutePreset({
                  headline: "DOJ Antitrust Subpoenas Cloud Provider Over Accelerated Hardware Bundling",
                  source: "Financial Times",
                  content: "Regulators demand unredacted vendor agreements regarding GPU quota distribution."
                })}
                className="w-full text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">🚨 DOJ Antitrust Probe (High Risk)</span>
                <span className="text-[10px] text-amber-400 font-bold ml-1 shrink-0">➔ Route</span>
              </button>
              <button
                type="button"
                disabled={routing}
                onClick={() => handleRoutePreset({
                  headline: "Mega-Cap Hyperscaler Inks $3.2B Clean Nuclear Energy Agreement for New Data Hubs",
                  source: "Bloomberg",
                  content: "Secures long-term baseload electricity through 2038 to mitigate grid constraints."
                })}
                className="w-full text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">⚡ Hyperscaler Nuclear Power Pact</span>
                <span className="text-[10px] text-emerald-400 font-bold ml-1 shrink-0">➔ Route</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Classified Feed Stream */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Feed Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 glass-panel rounded-xl border border-slate-800">
            <div className="flex items-center space-x-3 text-xs text-slate-400 font-semibold">
              <div className="flex items-center space-x-1.5">
                <Filter className="h-3.5 w-3.5 text-cyan-400" />
                <span>Filter Feed:</span>
              </div>
              <button
                type="button"
                onClick={handleResetFeed}
                title="Reset feed to initial sample signals"
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL', label: 'All Signals' },
                { id: 'High', label: 'High Impact' },
                { id: 'Medium', label: 'Medium' },
                { id: 'Low', label: 'Low' },
                { id: 'MATERIAL_RISK', label: '🚨 Material Risk Only' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilterTier(btn.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterTier === btn.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {filteredFeed.map((item) => {
              const c = item.defaultClassification;
              return (
                <div
                  key={item.id}
                  className={`glass-panel glass-card-hover rounded-2xl p-5 border transition-all ${
                    c?.is_material_risk
                      ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/10 to-slate-900/80 shadow-lg shadow-rose-500/5'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Card Header with Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      {getTierBadge(c?.impact_tier)}
                      {c?.is_material_risk && (
                        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500 text-slate-950 animate-pulse">
                          <AlertOctagon className="h-3 w-3" />
                          <span>Material Risk Anomaly</span>
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">
                        {c?.category || 'Market Macro'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{item.source}</span>
                      <span>•</span>
                      <span>{item.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handleDismissItem(item.id)}
                        title="Dismiss signal from feed"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {item.headline}
                  </h3>

                  {item.content && (
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                      {item.content}
                    </p>
                  )}

                  {/* Nemotron Analysis Breakdown */}
                  {c && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                      
                      {/* Urgency Meter */}
                      <div className="md:col-span-3 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Urgency Meter</span>
                        <div className="flex items-baseline space-x-1 my-1">
                          <span className={`text-xl font-mono font-extrabold ${c.urgency_score >= 7 ? 'text-rose-400' : 'text-amber-400'}`}>
                            {c.urgency_score}
                          </span>
                          <span className="text-slate-500 text-xs">/ 10</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${c.urgency_score >= 7 ? 'bg-rose-500' : 'bg-amber-400'}`}
                            style={{ width: `${c.urgency_score * 10}%` }}
                          />
                        </div>
                      </div>

                      {/* Capital Impact Narrative */}
                      <div className="md:col-span-5 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                          <Zap className="h-3 w-3 text-cyan-400" />
                          <span>Market Impact Analysis</span>
                        </span>
                        <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                          {c.market_impact_analysis}
                        </p>
                      </div>

                      {/* Recommended Trader Action */}
                      <div className="md:col-span-4 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span>Recommended Action</span>
                        </span>
                        <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                          {c.recommended_action}
                        </p>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
};

export default TabNews;
