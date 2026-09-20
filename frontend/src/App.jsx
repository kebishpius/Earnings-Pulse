import React, { useState, useEffect } from 'react';
import { useAppAuth } from './auth/AuthContext';
import Navbar from './components/Navbar';
import { Activity, Lock, Cpu, Globe, ArrowRight, ShieldCheck, Sparkles, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import TabEarnings from './components/TabEarnings';
import TabRadar from './components/TabRadar';
import TabPortfolio from './components/TabPortfolio';
import TabAdvisor from './components/TabAdvisor';

function App() {
  const {
    isAuthenticated,
    isLoading,
    loginWithAuth0,
    loginAsDemo,
    isAuth0Configured,
    openConfigModal,
    authConfig,
    auth0Error
  } = useAppAuth();

  const [activeTab, setActiveTab] = useState('earnings');
  const [backendHealth, setBackendHealth] = useState(null);

  // Set when the Radar hands a company off to the analyzer. The nonce makes
  // each hand-off distinct, so asking for the same company twice runs twice.
  const [analyzeRequest, setAnalyzeRequest] = useState(null);

  const requestAnalysis = (query) => {
    setAnalyzeRequest({ query, nonce: Date.now() });
    setActiveTab('earnings');
  };

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setBackendHealth(data))
      .catch((err) => console.log('Backend health status offline:', err));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070a12] flex flex-col items-center justify-center text-slate-200">
        <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center animate-pulse">
          <Activity className="h-6 w-6 text-cyan-400 animate-spin" />
        </div>
        <p className="mt-4 text-xs font-mono text-cyan-300">Synchronizing Auth0 Security Session...</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Unauthenticated Login Gateway (Auth0 + One-Click Demo Mode)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-cyan-500/30">
        
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        
        {/* Top Minimal Brand Bar */}
        <header className="max-w-7xl mx-auto px-6 py-6 w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-[#070a12] rounded-[10px] flex items-center justify-center">
                <Activity className="h-4 w-4 text-cyan-400" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">EarningsPulse</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={openConfigModal}
              title="Configure Auth0 Tenant"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Auth0 Config</span>
            </button>

            <div className="flex items-center space-x-2 font-semibold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SteelHacks XIII Edition</span>
            </div>
          </div>
        </header>

        {/* Hero & Authentication Card */}
        <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wide mb-6 shadow-sm shadow-cyan-500/10">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Dual-Model Architecture: Google Gemini + NVIDIA Nemotron NIM</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
            Next-Gen <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">Financial Risk Routing</span> Platform
          </h1>

          <p className="mt-4 text-slate-400 max-w-xl text-sm sm:text-base leading-relaxed">
            Real-time corporate earnings intelligence combining Google Gemini's live web grounding with NVIDIA Nemotron deep financial reasoning, market anomaly routing, and portfolio leak auditing.
          </p>

          {/* Secure Login & Access Card */}
          <div className="mt-10 w-full max-w-md glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider text-slate-400 mb-5">
              <div className="flex items-center space-x-2">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Identity Verification</span>
              </div>
              <button
                type="button"
                onClick={openConfigModal}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                title="Configure Auth0 Domain & Client ID"
              >
                <Settings className="h-3 w-3" />
                <span>{isAuth0Configured ? "Auth0 Live" : "Tenant Setup"}</span>
              </button>
            </div>

            {/* Auth0 Error Banner (if any) */}
            {auth0Error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs text-left flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Auth0 Notification</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">{auth0Error.message || "Auth0 verification issue."}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Primary Auth0 Login Button */}
              <button
                type="button"
                onClick={loginWithAuth0}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer group"
              >
                <Lock className="h-4 w-4 text-cyan-200 group-hover:scale-110 transition-transform" />
                <span>
                  {isAuth0Configured
                    ? "Authenticate with Auth0 (Universal Login)"
                    : "Authenticate with Auth0"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Instant Hackathon Demo Mode (Zero Friction for Judges) */}
              <button
                type="button"
                onClick={loginAsDemo}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-cyan-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer group"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                <span>Instant Hackathon Demo Login</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="pt-2 text-[11px] text-slate-500 text-center">
                Signed in as Lead Quantitative Risk Architect • Preloaded with SteelHacks sample datasets
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-left">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center space-x-1 text-cyan-400 text-[10px] font-bold uppercase">
                  <Globe className="h-3 w-3" />
                  <span>Gemini Grounded</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">Live SEC & news grounding via Google Search tools</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center space-x-1 text-emerald-400 text-[10px] font-bold uppercase">
                  <Cpu className="h-3 w-3" />
                  <span>NVIDIA Nemotron</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">NIM API financial metrics & risk extraction</p>
              </div>
            </div>

          </div>

        </main>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-6 py-6 w-full text-center text-xs text-slate-500 border-t border-slate-900">
          EarningsPulse • Built for SteelHacks XIII • Powered by Google Cloud & NVIDIA NIM
        </footer>

      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated Multi-Tab Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Sticky Header Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ backgroundColor: '#070a12' }}>
        <div style={{ display: activeTab === 'earnings' ? 'block' : 'none', backgroundColor: '#070a12' }}>
          <TabEarnings analyzeRequest={analyzeRequest} />
        </div>
        <div style={{ display: activeTab === 'radar' ? 'block' : 'none', backgroundColor: '#070a12' }}>
          <TabRadar onAnalyze={requestAnalysis} />
        </div>
        <div style={{ display: activeTab === 'portfolio' ? 'block' : 'none', backgroundColor: '#070a12' }}>
          <TabPortfolio />
        </div>
        <div style={{ display: activeTab === 'advisor' ? 'block' : 'none', backgroundColor: '#070a12' }}>
          <TabAdvisor />
        </div>
      </main>

      {/* Persistent Bottom Status Bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-3 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300">EarningsPulse v1.0.0</span>
            <span>•</span>
            <span className="text-cyan-400 font-mono">SteelHacks XIII</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>AI Systems Online</span>
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span>Earnings: Gemini 2.0 Flash</span>
            <span>•</span>
            <span>Radar: Nasdaq &amp; SEC EDGAR</span>
            <span>•</span>
            <span className="text-emerald-400">AI Advisor: NVIDIA Nemotron NIM</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
