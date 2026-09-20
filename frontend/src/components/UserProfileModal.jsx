import React, { useState, useEffect, useRef } from 'react';
import {
  User, ShieldCheck, Lock, Settings, Sliders, CalendarClock,
  CheckCircle2, X, LogOut, Search, Plus
} from 'lucide-react';
import { useAppAuth, MAX_WATCHLIST, PREP_WINDOW_CHOICES } from '../auth/AuthContext';

const UserProfileModal = ({ isOpen, onClose }) => {
  const {
    user,
    isAuth0User,
    logout,
    openConfigModal,
    authConfig,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    prepWindowDays,
    setPrepWindow
  } = useAppAuth();

  // The watchlist lives in the provider, not in a local copy of it. Editing it
  // here and on the Radar used to mean two drafts of the same list, where
  // whichever one saved last silently won.
  const [tickerInput, setTickerInput] = useState('');
  const [matches, setMatches] = useState([]);
  const [notice, setNotice] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'preferences'
  const searchBoxRef = useRef(null);

  // Check what was typed against SEC EDGAR's company list, so a mistyped
  // symbol is caught here instead of becoming a watchlist entry that no feed
  // can ever resolve.
  useEffect(() => {
    const term = tickerInput.trim();
    if (!term) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(term)}&limit=6`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMatches(Array.isArray(data) ? data : []);
      } catch {
        // Autocomplete is a convenience; a typed symbol still works without it.
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [tickerInput]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setMatches([]);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!isOpen) return null;

  const commitTicker = (symbol) => {
    const result = addToWatchlist(symbol);
    const messages = {
      added: `${result.symbol} added to your watchlist.`,
      duplicate: `You are already watching ${result.symbol}.`,
      full: `Your watchlist holds ${MAX_WATCHLIST} companies. Remove one to add another.`,
      invalid: 'Enter a ticker symbol, for example NVDA.',
    };
    setNotice({ status: result.status, message: messages[result.status] });
    setTimeout(() => setNotice(null), 3200);
    setTickerInput('');
    setMatches([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col text-left max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className="h-11 w-11 rounded-xl border-2 border-cyan-500/50 object-cover shadow-md shadow-cyan-500/20"
              />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white leading-none">{user?.name || "Analyst Profile"}</h3>
                {isAuth0User ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1">
                    <Lock className="h-2.5 w-2.5" />
                    <span>Auth0 Verified</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    <span>Demo Profile</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-xs">
                {user?.email || "quant-analyst@steelhacks.io"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-5 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Identity & Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'preferences'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Watchlist & Radar</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 flex-1">
          
          {/* Tab 1: Profile & Identity */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Auth0 Identity Record
                </span>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">User Subject ID</span>
                    <span className="font-mono text-slate-200 text-[11px] truncate block" title={user?.sub || 'demo-user'}>
                      {user?.sub || 'demo-auth0-sub-id'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Identity Provider</span>
                    <span className="font-semibold text-cyan-400">
                      {isAuth0User ? (user?.sub?.startsWith('google') ? 'Google OAuth 2.0' : 'Auth0 Database') : 'Local Sandbox'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Verification</span>
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{user?.email_verified ? 'Verified Email' : 'Active Account'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Session Token Storage</span>
                    <span className="text-slate-200 font-mono text-[11px]">
                      LocalStorage (PKCE)
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Connected Tenant Information
                </span>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-400">Auth0 Domain:</span>
                  <span className="font-mono text-cyan-300">{authConfig.domain || 'dev-ddice6lq1sgdxr4j.us.auth0.com'}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Client ID:</span>
                  <span className="font-mono text-slate-300">{authConfig.clientId ? `${authConfig.clientId.slice(0, 10)}...` : 'iFl6xIQNQ...'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { onClose(); openConfigModal(); }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  <Settings className="h-3 w-3" />
                  <span>Configure Alternate Auth0 Tenant</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onClose(); logout(); }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign Out of Session</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Watchlist & Radar preferences */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Watchlist
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {watchlist.length}/{MAX_WATCHLIST}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  The companies the Earnings Radar tracks. Changes save as you make them.
                </p>

                <div ref={searchBoxRef} className="relative">
                  <form
                    onSubmit={(e) => { e.preventDefault(); commitTicker(tickerInput); }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={tickerInput}
                        onChange={(e) => setTickerInput(e.target.value)}
                        placeholder="Ticker or company name (e.g. NVDA, Costco)"
                        className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!tickerInput.trim() || watchlist.length >= MAX_WATCHLIST}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl text-xs flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </form>

                  {matches.length > 0 && (
                    <ul className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/98 backdrop-blur shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                      {matches.map((m) => (
                        <li key={m.cik || m.ticker}>
                          <button
                            type="button"
                            onClick={() => commitTicker(m.ticker)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-800/80 flex items-center space-x-2 cursor-pointer transition-colors"
                          >
                            <span className="text-[11px] font-mono font-bold text-cyan-300 w-14 shrink-0">${m.ticker}</span>
                            <span className="text-[11px] text-slate-300 truncate">{m.company_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {notice && (
                  <p className={`text-[11px] font-semibold mt-2 ${notice.status === 'added' ? 'text-green-300' : 'text-amber-300'}`}>
                    {notice.message}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {watchlist.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Your watchlist is empty. The Radar will have nothing to track until you add a company.
                    </p>
                  ) : watchlist.map((ticker) => (
                    <span
                      key={ticker}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold font-mono"
                    >
                      <span>${ticker}</span>
                      <button
                        type="button"
                        onClick={() => removeFromWatchlist(ticker)}
                        title={`Remove ${ticker}`}
                        className="text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Prep window
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  How far ahead of a report the Radar starts flagging a company as needing attention.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {PREP_WINDOW_CHOICES.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPrepWindow(days)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        prepWindowDays === days
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center space-x-1.5">
                        <CalendarClock className="h-3 w-3" />
                        <span>{days} {days === 1 ? 'day' : 'days'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {days === 7 ? 'Plenty of notice' : days === 3 ? 'Balanced' : 'Just before'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            <span>Saved automatically, and kept across browser restarts</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserProfileModal;
