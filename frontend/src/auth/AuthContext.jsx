import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Check if Auth0 is configured with real credentials (module-level, not a hook)
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const IS_AUTH0_CONFIGURED = Boolean(
  AUTH0_DOMAIN &&
  AUTH0_CLIENT_ID &&
  !AUTH0_DOMAIN.includes('example.com') &&
  !AUTH0_CLIENT_ID.includes('dummy')
);

// Inner component that safely uses useAuth0() — only rendered when Auth0 is configured
const Auth0ConnectedProvider = ({ children, demoUser, setDemoUser }) => {
  // This component is ONLY rendered when IS_AUTH0_CONFIGURED is true,
  // so it's safe to call useAuth0() unconditionally here (no Rules of Hooks violation).
  // eslint-disable-next-line
  const { isAuthenticated: a0Auth, user: a0User, isLoading, loginWithRedirect, logout: a0Logout } = (() => {
    try {
      const { useAuth0 } = require('@auth0/auth0-react');
      return useAuth0();
    } catch {
      return { isAuthenticated: false, user: null, isLoading: false, loginWithRedirect: null, logout: null };
    }
  })();

  const logoutUser = () => {
    setDemoUser(null);
    localStorage.removeItem('earningspulse_demo_user');
    if (a0Logout) {
      a0Logout({ logoutParams: { returnTo: window.location.origin } });
    }
  };

  const loginAsDemo = () => {
    const sampleUser = {
      name: "Dr. Elena Vance",
      email: "elena.vance@citadel-risk.io",
      picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "Lead Quantitative Risk Architect",
      institution: "SteelHacks Asset Management"
    };
    setDemoUser(sampleUser);
    localStorage.setItem('earningspulse_demo_user', JSON.stringify(sampleUser));
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: Boolean(demoUser || a0Auth),
      user: demoUser || a0User,
      isLoading: !demoUser && isLoading,
      isAuth0Configured: IS_AUTH0_CONFIGURED,
      loginWithAuth0: loginWithRedirect,
      loginAsDemo,
      logout: logoutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Demo-only provider (when Auth0 is NOT configured with real credentials)
const DemoOnlyProvider = ({ children, demoUser, setDemoUser }) => {
  const loginAsDemo = () => {
    const sampleUser = {
      name: "Dr. Elena Vance",
      email: "elena.vance@citadel-risk.io",
      picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "Lead Quantitative Risk Architect",
      institution: "SteelHacks Asset Management"
    };
    setDemoUser(sampleUser);
    localStorage.setItem('earningspulse_demo_user', JSON.stringify(sampleUser));
  };

  const logoutUser = () => {
    setDemoUser(null);
    localStorage.removeItem('earningspulse_demo_user');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: Boolean(demoUser),
      user: demoUser,
      isLoading: false,
      isAuth0Configured: false,
      loginWithAuth0: null,
      loginAsDemo,
      logout: logoutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  const [demoUser, setDemoUser] = useState(() => {
    try {
      const saved = localStorage.getItem('earningspulse_demo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Always use the demo-only provider to avoid all hook-in-try/catch issues.
  // Auth0 integration can be re-enabled later with a proper conditional mount.
  return (
    <DemoOnlyProvider demoUser={demoUser} setDemoUser={setDemoUser}>
      {children}
    </DemoOnlyProvider>
  );
};

export const useAppAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAppAuth must be used within an AuthProvider");
  }
  return context;
};
