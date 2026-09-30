import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, logout as apiLogout, verifySession, onSessionExpired } from '@/lib/api';

interface AuthContextValue {
  isAuthenticated: boolean;
  isChecking: boolean;
  signIn: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isChecking: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;

    verifySession().then((valid) => {
      if (!active) return;
      setIsAuthenticated(valid);
      setIsChecking(false);
    });

    // A 401 from any request means the token is gone or expired.
    const unsubscribe = onSessionExpired(() => setIsAuthenticated(false));

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (password: string) => {
    await apiLogin(password);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isChecking, signIn, signOut }),
    [isAuthenticated, isChecking, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}