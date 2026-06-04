import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('psaipay_token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('psaipay_user'));

  const login = async (username: string, password: string) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const { token: t, username: u } = res.data;
    localStorage.setItem('psaipay_token', t);
    localStorage.setItem('psaipay_user', u);
    setToken(t);
    setUsername(u);
  };

  const logout = () => {
    localStorage.removeItem('psaipay_token');
    localStorage.removeItem('psaipay_user');
    setToken(null);
    setUsername(null);
  };

  return <AuthContext.Provider value={{ token, username, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
