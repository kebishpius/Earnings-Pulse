import React from 'react';
import { Activity, ShieldAlert, Cpu, Globe, LogOut, ShieldCheck, Lock } from 'lucide-react';
import { useAppAuth } from '../auth/AuthContext';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout, isDemo, isAuth0User, openProfileModal } = useAppAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070a12]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Hackathon Badge */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-[#070a12] rounded-[10px] flex items-center justify-center">
                <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-300">
                  EarningsPulse
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
                  SteelHacks XIII
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Dual-Model AI Financial Decision & Risk Router</p>
            </div>
          </div>

          {/* AI Pipeline Architecture Indicators */}
          <div className="hidden lg:flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              <span className="font-medium text-slate-400">Retrieval:</span>
              <span className="font-semibold text-blue-300">Gemini Grounded</span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium text-slate-400">Reasoning:</span>
              <span className="font-semibold text-emerald-300">NVIDIA Nemotron NIM</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>

          {/* User Profile & Settings */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 pl-2 pr-2 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs shadow-inner">
              <button
                type="button"
                onClick={openProfileModal}
                title="Open Auth0 Profile & Quant Risk Settings"
                className="flex items-center space-x-2 text-left hover:opacity-90 transition-opacity cursor-pointer group"
              >
                {user?.picture ? (
                  <img src={user.picture} alt={user.name || "User"} className="h-7 w-7 rounded-full border border-cyan-500/50 object-cover group-hover:border-cyan-400" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-cyan-900/90 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-[11px] font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors leading-none">
                      {user?.name || "Analyst"}
                    </p>
                    {isAuth0User ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center space-x-0.5">
                        <Lock className="h-2 w-2" />
                        <span>Auth0</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-0.5">
                        <ShieldCheck className="h-2 w-2" />
                        <span>Demo</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight truncate max-w-[130px] mt-0.5">
                    {user?.email || "Authenticated"}
                  </p>
                </div>
              </button>

              <button
                onClick={logout}
                title="Sign Out of Session"
                type="button"
                className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors ml-1 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Tab Navigation Navigation */}
        <div className="flex space-x-1 border-t border-slate-800/60 pt-2 pb-2.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('earnings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'earnings'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>1. Live Earnings Fetcher & Analyzer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'news'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>2. News & Signal Router</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'portfolio'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>3. Portfolio & Risk Audit</span>
          </button>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
