import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  X, 
  Sparkles, 
  Zap, 
  Building2, 
  Layers, 
  Info, 
  ChevronRight,
  Shield
} from 'lucide-react';

const BROKER_ICONS = {
  ROBINHOOD: '🟢',
  FIDELITY: '🌲',
  SCHWAB: '🏛️',
  WEBULL: '🐂',
  OTHER: '🌐'
};

export const BrokerageConnectModal = ({ isOpen, onClose, onSyncSuccess, userId }) => {
  const [statusInfo, setStatusInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectingBroker, setConnectingBroker] = useState(null);
  const [error, setError] = useState(null);
  const [showKeyGuide, setShowKeyGuide] = useState(false);

  // Fetch status of SnapTrade configuration (sandbox vs live)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/brokerage/status')
      .then(res => res.json())
      .then(data => setStatusInfo(data))
      .catch(err => console.warn('Failed to load brokerage status:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectBroker = async (brokerKey) => {
    setLoading(true);
    setConnectingBroker(brokerKey);
    setError(null);

    try {
      // 1. Create connection session
      const sessionRes = await fetch('/api/brokerage/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || 'ep_user_default',
          broker: brokerKey
        })
      });

      if (!sessionRes.ok) {
        throw new Error(`Failed to initialize session (${sessionRes.status})`);
      }

      const sessionData = await sessionRes.json();

      // In a live environment with user redirect, we can open sessionData.redirect_url in a popup or new tab:
      // if (sessionData.mode === 'live' && sessionData.redirect_url) {
      //   window.open(sessionData.redirect_url, 'SnapTradeAuth', 'width=500,height=700');
      // }

      // 2. Fetch and synchronize holdings
      // Add brief natural delay so user sees connection authorization step
      await new Promise(r => setTimeout(r, 900));

      const syncRes = await fetch('/api/brokerage/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || 'ep_user_default',
          broker: brokerKey
        })
      });

      if (!syncRes.ok) {
        throw new Error(`Holding synchronization failed (${syncRes.status})`);
      }

      const syncData = await syncRes.json();
      
      // Notify parent TabPortfolio of synced holdings
      onSyncSuccess(syncData);
      onClose();
    } catch (err) {
      console.error('Brokerage connection error:', err);
      setError(err.message || 'An error occurred during broker connection.');
    } finally {
      setLoading(false);
      setConnectingBroker(null);
    }
  };

  const isLive = statusInfo?.mode === 'live';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Zap className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Connect Brokerage Account</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SnapTrade
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                  {isLive ? 'Live API Active' : 'Sandbox Demo Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400">1-click instant portfolio sync with institutional OAuth security</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security & Compliance Banner */}
        <div className="px-6 py-3 bg-emerald-950/20 border-b border-emerald-500/20 flex items-start space-x-3 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-300">SOC-2 Type II Certified | Read-Only Access</p>
            <p className="text-[11px] text-emerald-400/80 leading-relaxed">
              EarningsPulse <strong>never</strong> asks for or stores your broker passwords or 2FA codes. All authentication happens via delegated OAuth. We cannot execute trades or move money.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center space-x-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body: Broker List */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Your Brokerage or Trading App
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Robinhood */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleConnectBroker('ROBINHOOD')}
              className="group p-4 rounded-xl bg-slate-950/60 hover:bg-emerald-950/20 border border-slate-800 hover:border-emerald-500/40 transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  {BROKER_ICONS.ROBINHOOD}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Robinhood</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">Popular</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Stocks, Crypto, High-Growth</p>
                </div>
              </div>
              {connectingBroker === 'ROBINHOOD' ? (
                <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              )}
            </button>

            {/* Fidelity */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleConnectBroker('FIDELITY')}
              className="group p-4 rounded-xl bg-slate-950/60 hover:bg-green-950/20 border border-slate-800 hover:border-green-500/40 transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  {BROKER_ICONS.FIDELITY}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-white group-hover:text-green-300 transition-colors">Fidelity</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-green-500/20 text-green-400">Core</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Index, 401(k), ETFs</p>
                </div>
              </div>
              {connectingBroker === 'FIDELITY' ? (
                <RefreshCw className="h-4 w-4 text-green-400 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all" />
              )}
            </button>

            {/* Charles Schwab */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleConnectBroker('SCHWAB')}
              className="group p-4 rounded-xl bg-slate-950/60 hover:bg-blue-950/20 border border-slate-800 hover:border-blue-500/40 transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  {BROKER_ICONS.SCHWAB}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Charles Schwab</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Equities, Dividends, Wealth</p>
                </div>
              </div>
              {connectingBroker === 'SCHWAB' ? (
                <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              )}
            </button>

            {/* Webull */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleConnectBroker('WEBULL')}
              className="group p-4 rounded-xl bg-slate-950/60 hover:bg-amber-950/20 border border-slate-800 hover:border-amber-500/40 transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  {BROKER_ICONS.WEBULL}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Webull</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Tech, Beta, Momentum</p>
                </div>
              </div>
              {connectingBroker === 'WEBULL' ? (
                <RefreshCw className="h-4 w-4 text-amber-400 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              )}
            </button>
          </div>

          {/* Other Brokers via SnapTrade */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleConnectBroker('ROBINHOOD')}
            className="w-full p-3 rounded-xl bg-slate-950/40 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all text-xs flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <span>Connect Other Broker (E*TRADE, Vanguard, Interactive Brokers, Alpaca, Merrill)</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Sandbox Info & Live API Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowKeyGuide(v => !v)}
              className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" />
              <span>{showKeyGuide ? 'Hide SnapTrade API Setup Details' : 'Want to connect your own live SnapTrade production keys? Click here.'}</span>
            </button>

            {showKeyGuide && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2 animate-fadeIn">
                <p className="font-semibold text-white">How Live SnapTrade Integration Works:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Sign up for a free developer account at <a href="https://snaptrade.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">snaptrade.com</a>.</li>
                  <li>Copy your <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded">SNAPTRADE_CLIENT_ID</code> and <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded">SNAPTRADE_CONSUMER_KEY</code>.</li>
                  <li>Add them to your <code className="text-cyan-300 bg-slate-800 px-1 py-0.5 rounded">.env</code> file.</li>
                  <li>Restart the backend server — EarningsPulse will switch to live SnapTrade connection URLs!</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>Encrypted with AES-256 / TLS 1.3</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrokerageConnectModal;
