import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

const AuthContext = createContext(null);

// Helper to determine if an Auth0 configuration value is dummy, placeholder, or empty
export const isAuth0Placeholder = (val) => {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === '' ||
    s.includes('dummy') ||
    s.includes('example.com') ||
    s.includes('your_') ||
    s.includes('steelhacks') ||
    s === 'undefined' ||
    s === 'null'
  );
};

// Retrieve configured or persisted domain and clientId
export const getAuthConfig = () => {
  const envDomain = (import.meta.env.VITE_AUTH0_DOMAIN || '').trim();
  const envClientId = (import.meta.env.VITE_AUTH0_CLIENT_ID || '').trim();

  let savedDomain = '';
  let savedClientId = '';
  try {
    savedDomain = (localStorage.getItem('earningspulse_auth0_domain') || '').trim();
    savedClientId = (localStorage.getItem('earningspulse_auth0_client_id') || '').trim();
  } catch {
    // localStorage might not be available in some private browsing contexts
  }

  // If saved values are legacy placeholders, discard them
  if (isAuth0Placeholder(savedDomain)) savedDomain = '';
  if (isAuth0Placeholder(savedClientId)) savedClientId = '';

  const domain = savedDomain || envDomain;
  const clientId = savedClientId || envClientId;

  const isConfigured = Boolean(
    domain &&
    clientId &&
    !isAuth0Placeholder(domain) &&
    !isAuth0Placeholder(clientId)
  );

  return { domain, clientId, isConfigured };
};

// Default Demo User Profile (Preloaded for Hackathon Reviewers)
const DEMO_USER = {
  name: "Dr. Elena Vance",
  email: "elena.vance@citadel-risk.io",
  picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  role: "Lead Quantitative Risk Architect",
  institution: "SteelHacks Asset Management"
};

// ----------------------------------------------------------------------
// Inner Consumer for live Auth0 provider
// ----------------------------------------------------------------------
const Auth0InnerConsumer = ({ children, authConfig, updateAuthConfig, openConfigModal }) => {
  const {
    isAuthenticated: a0Auth,
    user: a0User,
    isLoading: a0Loading,
    loginWithRedirect,
    logout: a0Logout,
    error: a0Error
  } = useAuth0();

  const [demoUser, setDemoUser] = useState(() => {
    try {
      const saved = localStorage.getItem('earningspulse_demo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // When live Auth0 authenticates, clear any demo state
  useEffect(() => {
    if (a0Auth) {
      setDemoUser(null);
      try {
        localStorage.removeItem('earningspulse_demo_user');
      } catch {
        // ignore
      }
    }
  }, [a0Auth]);

  const loginAsDemo = () => {
    setDemoUser(DEMO_USER);
    try {
      localStorage.setItem('earningspulse_demo_user', JSON.stringify(DEMO_USER));
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setDemoUser(null);
    try {
      localStorage.removeItem('earningspulse_demo_user');
    } catch {
      // ignore
    }
    if (a0Auth && a0Logout) {
      a0Logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    }
  };

  const loginWithAuth0 = async () => {
    try {
      if (loginWithRedirect) {
        await loginWithRedirect({
          appState: {
            returnTo: window.location.pathname
          }
        });
      }
    } catch (err) {
      console.error("Auth0 login error:", err);
    }
  };

  const contextValue = useMemo(() => ({
    isAuthenticated: Boolean(a0Auth || demoUser),
    user: a0Auth ? a0User : demoUser,
    isDemo: Boolean(!a0Auth && demoUser),
    isAuth0User: Boolean(a0Auth),
    isLoading: Boolean(!demoUser && a0Loading),
    isAuth0Configured: true,
    authConfig,
    auth0Error: a0Error,
    loginWithAuth0,
    loginAsDemo,
    logout,
    updateAuthConfig,
    openConfigModal
  }), [demoUser, a0Auth, a0User, a0Loading, a0Error, authConfig]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ----------------------------------------------------------------------
// Standalone Consumer for unconfigured / demo mode
// ----------------------------------------------------------------------
const StandaloneConsumer = ({ children, authConfig, updateAuthConfig, openConfigModal }) => {
  const [demoUser, setDemoUser] = useState(() => {
    try {
      const saved = localStorage.getItem('earningspulse_demo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const loginAsDemo = () => {
    setDemoUser(DEMO_USER);
    try {
      localStorage.setItem('earningspulse_demo_user', JSON.stringify(DEMO_USER));
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setDemoUser(null);
    try {
      localStorage.removeItem('earningspulse_demo_user');
    } catch {
      // ignore
    }
  };

  const loginWithAuth0 = () => {
    // When Auth0 is not yet configured, trigger the configuration modal
    if (openConfigModal) {
      openConfigModal();
    }
  };

  const contextValue = useMemo(() => ({
    isAuthenticated: Boolean(demoUser),
    user: demoUser,
    isDemo: Boolean(demoUser),
    isAuth0User: false,
    isLoading: false,
    isAuth0Configured: false,
    authConfig,
    auth0Error: null,
    loginWithAuth0,
    loginAsDemo,
    logout,
    updateAuthConfig,
    openConfigModal
  }), [demoUser, authConfig]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ----------------------------------------------------------------------
// Master AuthProvider Component
// ----------------------------------------------------------------------
export const AuthProvider = ({ children }) => {
  const [authConfig, setAuthConfig] = useState(getAuthConfig);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const updateAuthConfig = (newDomain, newClientId) => {
    const trimmedDomain = (newDomain || '').trim();
    const trimmedClientId = (newClientId || '').trim();
    try {
      if (trimmedDomain) {
        localStorage.setItem('earningspulse_auth0_domain', trimmedDomain);
      } else {
        localStorage.removeItem('earningspulse_auth0_domain');
      }
      if (trimmedClientId) {
        localStorage.setItem('earningspulse_auth0_client_id', trimmedClientId);
      } else {
        localStorage.removeItem('earningspulse_auth0_client_id');
      }
    } catch {
      // ignore
    }
    setAuthConfig(getAuthConfig());
  };

  const openConfigModal = () => setIsConfigModalOpen(true);
  const closeConfigModal = () => setIsConfigModalOpen(false);

  const onRedirectCallback = (appState) => {
    window.history.replaceState(
      {},
      document.title,
      appState?.returnTo || window.location.pathname
    );
  };

  // If valid non-placeholder domain and clientId are provided, mount the official Auth0Provider
  if (authConfig.isConfigured) {
    return (
      <Auth0Provider
        domain={authConfig.domain}
        clientId={authConfig.clientId}
        authorizationParams={{
          redirect_uri: typeof window !== 'undefined' ? window.location.origin : ''
        }}
        onRedirectCallback={onRedirectCallback}
        cacheLocation="localstorage"
        useRefreshTokens={true}
      >
        <Auth0InnerConsumer
          authConfig={authConfig}
          updateAuthConfig={updateAuthConfig}
          openConfigModal={openConfigModal}
        >
          {children}
          {isConfigModalOpen && (
            <Auth0ConfigModal
              authConfig={authConfig}
              onSave={updateAuthConfig}
              onClose={closeConfigModal}
            />
          )}
        </Auth0InnerConsumer>
      </Auth0Provider>
    );
  }

  // Otherwise, use the zero-friction standalone provider
  return (
    <StandaloneConsumer
      authConfig={authConfig}
      updateAuthConfig={updateAuthConfig}
      openConfigModal={openConfigModal}
    >
      {children}
      {isConfigModalOpen && (
        <Auth0ConfigModal
          authConfig={authConfig}
          onSave={updateAuthConfig}
          onClose={closeConfigModal}
        />
      )}
    </StandaloneConsumer>
  );
};

// ----------------------------------------------------------------------
// Auth0 Configuration Modal
// ----------------------------------------------------------------------
const Auth0ConfigModal = ({ authConfig, onSave, onClose }) => {
  const [domainInput, setDomainInput] = useState(authConfig.domain || '');
  const [clientIdInput, setClientIdInput] = useState(authConfig.clientId || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(domainInput, clientIdInput);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleClear = () => {
    onSave('', '');
    setDomainInput('');
    setClientIdInput('');
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-left">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
              A0
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Auth0 Tenant Configuration</h3>
              <p className="text-xs text-slate-400">Manage identity provider connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Auth0 Domain
            </label>
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. your-tenant.us.auth0.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Found in your Auth0 Application Settings (Domain).
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Auth0 Client ID
            </label>
            <input
              type="text"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="e.g. 0123456789abcdef..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              SPA Client ID registered in your Auth0 tenant.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
              <span>✓ Settings updated successfully! Reconnecting...</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer transition-colors"
            >
              Reset to Env Defaults
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const useAppAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAppAuth must be used within an AuthProvider");
  }
  return context;
};
