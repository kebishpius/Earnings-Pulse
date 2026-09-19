import React, { useState, useRef, useEffect } from 'react';
import { useAppAuth } from '../auth/AuthContext';
import {
  Sparkles, Send, RefreshCw, Brain, Cpu, Globe, ChevronDown, ChevronUp,
  ShieldCheck, Zap, MessageSquare, BarChart2, Trash2, Database, User
} from 'lucide-react';

// ─── Model Definitions ────────────────────────────────────────────────────────
const AI_MODELS = [
  {
    id: 'gemini',
    label: 'Gemini 2.0 Flash',
    shortLabel: 'Gemini',
    provider: 'Google',
    icon: Globe,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-cyan-600',
    description: 'Google\'s fast multimodal model — great for broad financial reasoning',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    id: 'nemotron',
    label: 'NVIDIA Nemotron',
    shortLabel: 'Nemotron',
    provider: 'NVIDIA NIM',
    icon: Cpu,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-teal-600',
    description: 'NVIDIA\'s quantitative powerhouse — applies institutional risk frameworks',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'claude',
    label: 'Claude Sonnet',
    shortLabel: 'Claude',
    provider: 'Anthropic',
    icon: Brain,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/50',
    bgColor: 'bg-violet-500/10',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-purple-600',
    description: 'Anthropic\'s nuanced analyst — excels at behavioral finance & explanations',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  }
];

// ─── Quick Prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: BarChart2, text: "Analyze my spending patterns and categorize my top expenses" },
  { icon: Zap,      text: "Where am I overspending? Give me specific numbers from my data" },
  { icon: ShieldCheck, text: "What's my biggest financial risk right now?" },
  { icon: Sparkles, text: "Suggest a rebalancing plan for my portfolio holdings" },
  { icon: Database, text: "Summarize all my subscriptions and flag any I should cancel" },
  { icon: Brain,    text: "If I had $10,000 to invest today, what would you recommend?" },
];

// ─── Message Bubble Component ─────────────────────────────────────────────────
const MessageBubble = ({ msg, models }) => {
  const model = models.find(m => m.id === msg.modelId);
  const ModelIcon = model?.icon || Brain;

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] flex items-end space-x-2">
          <div className="bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-lg shadow-cyan-900/30">
            {msg.content}
          </div>
          <div className="h-7 w-7 rounded-full bg-cyan-900/80 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-cyan-300" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] flex items-start space-x-2">
        <div className={`h-7 w-7 rounded-full ${model?.bgColor || 'bg-slate-800'} border ${model?.borderColor || 'border-slate-700'} flex items-center justify-center shrink-0 mt-1`}>
          <ModelIcon className={`h-3.5 w-3.5 ${model?.color || 'text-slate-400'}`} />
        </div>
        <div>
          <div className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-1 ${model?.badge || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            <ModelIcon className="h-2.5 w-2.5" />
            <span>{model?.label || msg.modelId}</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-200 leading-relaxed shadow-sm whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Typing Indicator ────────────────────────────────────────────────────────
const TypingIndicator = ({ model }) => {
  const ModelIcon = model?.icon || Brain;
  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-2">
        <div className={`h-7 w-7 rounded-full ${model?.bgColor || 'bg-slate-800'} border ${model?.borderColor || 'border-slate-700'} flex items-center justify-center shrink-0 mt-1 animate-pulse`}>
          <ModelIcon className={`h-3.5 w-3.5 ${model?.color || 'text-slate-400'}`} />
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TabAdvisor = () => {
  const { uploadedPortfolio, hasPersonalData, user } = useAppAuth();
  const [selectedModelId, setSelectedModelId] = useState('gemini');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const selectedModel = AI_MODELS.find(m => m.id === selectedModelId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const buildPortfolioContext = () => {
    if (!hasPersonalData || !uploadedPortfolio) return null;
    return {
      holdings: uploadedPortfolio.holdings || [],
      transactions: uploadedPortfolio.transactions || [],
      last_audit: uploadedPortfolio.last_audit || null
    };
  };

  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, modelId: selectedModelId };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const portfolioContext = buildPortfolioContext();
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: selectedModelId,
          portfolio_context: portfolioContext
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `API error ${res.status}`);
      }

      const data = await res.json();
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.text,
        modelId: selectedModelId,
        provider: data.provider
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      // Remove the user message if request failed
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const ModelIcon = selectedModel?.icon || Brain;

  // Portfolio context summary for the sidebar
  const holdingCount = uploadedPortfolio?.holdings?.length || 0;
  const txCount = uploadedPortfolio?.transactions?.length || 0;
  const totalValue = (uploadedPortfolio?.holdings || []).reduce((s, h) => s + (h.current_value || 0), 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center space-x-2 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Brain className="h-3.5 w-3.5" />
              <span>Triple-Model AI Financial Advisor</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Financial Advisor</h2>
            <p className="text-sm text-slate-400 mt-1">
              Ask any financial question — your {hasPersonalData ? 'real portfolio data' : 'financial context'} is automatically provided as context.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            {hasPersonalData && (
              <button
                onClick={() => setShowContext(v => !v)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-950/60 transition-colors cursor-pointer"
              >
                <Database className="h-3.5 w-3.5" />
                <span>Your Data Loaded 🔒</span>
                {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Context Data Summary */}
        {showContext && hasPersonalData && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3 text-xs animate-fadeIn">
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
              <div className="text-cyan-400 font-bold text-base">{holdingCount}</div>
              <div className="text-slate-400 mt-0.5">Holdings</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
              <div className="text-cyan-400 font-bold text-base">{txCount}</div>
              <div className="text-slate-400 mt-0.5">Transactions</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
              <div className="text-cyan-400 font-bold text-base">${totalValue.toLocaleString()}</div>
              <div className="text-slate-400 mt-0.5">Portfolio Value</div>
            </div>
          </div>
        )}

        {!hasPersonalData && (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Tip:</strong> Upload your financial data in the Portfolio tab to get hyper-personalized advice. Without it, the AI gives general guidance.
            </span>
          </div>
        )}
      </div>

      {/* Model Selector */}
      <div className="grid grid-cols-3 gap-3">
        {AI_MODELS.map((m) => {
          const Icon = m.icon;
          const isActive = selectedModelId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedModelId(m.id)}
              className={`flex flex-col items-start p-4 rounded-2xl border transition-all cursor-pointer text-left group ${
                isActive
                  ? `${m.bgColor} ${m.borderColor} shadow-lg`
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`flex items-center space-x-2 ${isActive ? m.color : 'text-slate-400 group-hover:text-slate-200'}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">{m.shortLabel}</span>
                </div>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-current animate-pulse" style={{ color: 'inherit' }} />
                )}
              </div>
              <p className={`text-[10px] leading-relaxed ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                {m.description}
              </p>
              <span className={`mt-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${isActive ? m.badge : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                {m.provider}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chat Area */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col" style={{ minHeight: '520px' }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: '420px' }}>
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center py-10 text-center">
              <div className={`h-14 w-14 rounded-2xl ${selectedModel?.bgColor} border ${selectedModel?.borderColor} flex items-center justify-center mb-4`}>
                <ModelIcon className={`h-7 w-7 ${selectedModel?.color}`} />
              </div>
              <h3 className="text-base font-bold text-white">Ask {selectedModel?.label} Anything</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {hasPersonalData
                  ? `I have full context of your portfolio (${holdingCount} holdings, ${txCount} transactions).`
                  : 'Upload your financial data in the Portfolio tab for personalized advice.'}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} models={AI_MODELS} />
          ))}

          {isLoading && <TypingIndicator model={selectedModel} />}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts (shown when no messages) */}
        {messages.length === 0 && (
          <div className="px-5 pb-4">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2">Quick Prompts</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_PROMPTS.map((qp, i) => {
                const QIcon = qp.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(qp.text)}
                    disabled={isLoading}
                    className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 text-left text-xs text-slate-300 hover:text-white transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <QIcon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${selectedModel?.color} opacity-70 group-hover:opacity-100`} />
                    <span className="leading-snug">{qp.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-800 p-4">
          <div className={`flex items-end space-x-3 p-1 rounded-xl border ${selectedModel?.borderColor || 'border-slate-700'} bg-slate-900/60 focus-within:border-opacity-80 transition-colors`}>
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${selectedModel?.label}... (Enter to send, Shift+Enter for newline)`}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`mb-1 mr-1 p-2.5 rounded-lg bg-gradient-to-br ${selectedModel?.gradientFrom} ${selectedModel?.gradientTo} text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer hover:opacity-90 shrink-0`}
            >
              {isLoading
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5 text-center">
            AI-generated advice is for informational purposes only. Not financial advice.
          </p>
        </div>
      </div>

    </div>
  );
};

export default TabAdvisor;
