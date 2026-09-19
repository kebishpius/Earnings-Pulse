import React, { useState } from 'react';
import {
  User, ShieldCheck, Lock, Mail, Key, Globe, Settings, Sliders,
  Bookmark, CheckCircle2, X, LogOut, Sparkles, AlertTriangle, ChevronRight,
  TrendingUp, Plus, Trash2
} from 'lucide-react';
import { useAppAuth } from '../auth/AuthContext';

const UserProfileModal = ({ isOpen, onClose }) => {
  const {
    user,
    isAuth0User,
    isDemo,
    logout,
    openConfigModal,
    authConfig,
    userPreferences,
    updateUserPreferences
  } = useAppAuth();

  const [riskTolerance, setRiskTolerance] = useState(userPreferences?.riskTolerance || 'Balanced');
  const [watchlist, setWatchlist] = useState(userPreferences?.watchlist || ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'META']);
  const [newTickerInput, setNewTickerInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'preferences' | 'bookmarks'

  if (!isOpen) return null;

  const handleAddTicker = (e) => {
    e.preventDefault();
    const clean = newTickerInput.trim().toUpperCase();
    if (clean && !watchlist.includes(clean)) {
      setWatchlist([...watchlist, clean]);
      setNewTickerInput('');
    }
  };

  const handleRemoveTicker = (ticker) => {
    setWatchlist(watchlist.filter(t => t !== ticker));
  };

  const handleSave = () => {
    updateUserPreferences({
      ...userPreferences,
      riskTolerance,
      watchlist
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const savedSignals = userPreferences?.savedSignals || [];

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
            <span>Quant Risk & Watchlist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'bookmarks'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved Signals ({savedSignals.length})</span>
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

          {/* Tab 2: Quant Risk & Watchlist Preferences */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Portfolio Risk Appetite
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Determines urgency threshold triggers in News & Market Volatility Router.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Conservative', label: 'Conservative', desc: 'Alert Urgency ≥ 6' },
                    { id: 'Balanced', label: 'Balanced', desc: 'Alert Urgency ≥ 7' },
                    { id: 'Aggressive', label: 'Alpha Seeking', desc: 'Alert Urgency ≥ 8' },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setRiskTolerance(tier.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        riskTolerance === tier.id
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{tier.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Custom Watchlist Tickers
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Tickers monitored by default in your news and filings feed.
                </p>

                <form onSubmit={handleAddTicker} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTickerInput}
                    onChange={(e) => setNewTickerInput(e.target.value)}
                    placeholder="Enter ticker (e.g. NVDA, PLTR, AMD)"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 uppercase focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {watchlist.map((ticker) => (
                    <span
                      key={ticker}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold font-mono"
                    >
                      <span>${ticker}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTicker(ticker)}
                        className="text-slate-500 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Saved Bookmarks */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-3">
              {savedSignals.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40 text-cyan-400" />
                  <p className="text-xs font-semibold text-slate-400">No Bookmarked Signals Yet</p>
                  <p className="text-[11px] mt-1 text-slate-500">
                    Click the star icon on any news card in the News Router to pin it to your profile.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {savedSignals.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {item.ticker && (
                            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded mr-1.5">
                              ${item.ticker}
                            </span>
                          )}
                          <span className="font-semibold text-white text-xs">{item.headline}</span>
                        </div>
                      </div>
                      {item.defaultClassification && (
                        <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                          Action: {item.defaultClassification.recommended_action}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          {savedSuccess ? (
            <div className="text-xs text-emerald-400 font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Preferences saved to Auth0 Profile!</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">Preferences persist across browser restarts</span>
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            {activeTab === 'preferences' && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              >
                Save Preferences
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfileModal;
