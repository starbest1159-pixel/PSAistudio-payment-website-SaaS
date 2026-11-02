import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string | null;
  merchantId: string | null;
  tenantDbName: string | null;
  email: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('psaipay_token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('psaipay_user'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('psaipay_role'));
  const [merchantId, setMerchantId] = useState<string | null>(() => localStorage.getItem('psaipay_merchant_id'));
  const [tenantDbName, setTenantDbName] = useState<string | null>(() => localStorage.getItem('psaipay_tenant_db'));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem('psaipay_email'));

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await axios.post('/api/auth/login', { username: usernameOrEmail, password });
    const { token: t, username: u, role: r, merchantId: mid, tenantDbName: tdb, email: e } = res.data;
    localStorage.setItem('psaipay_token', t);
    localStorage.setItem('psaipay_user', u || e || '');
    localStorage.setItem('psaipay_role', r || 'tenant');
    localStorage.setItem('psaipay_merchant_id', mid || '');
    localStorage.setItem('psaipay_tenant_db', tdb || '');
    localStorage.setItem('psaipay_email', e || u || '');
    setToken(t);
    setUsername(u || e || '');
    setRole(r || 'tenant');
    setMerchantId(mid || '');
    setTenantDbName(tdb || '');
    setEmail(e || u || '');
  };

  const register = async (name: string, regEmail: string, password: string) => {
    const res = await axios.post('/api/auth/register', { name, email: regEmail, password });
    const { token: t, merchant } = res.data;
    localStorage.setItem('psaipay_token', t);
    localStorage.setItem('psaipay_user', regEmail);
    localStorage.setItem('psaipay_role', merchant.role || 'tenant');
    localStorage.setItem('psaipay_merchant_id', merchant.id || '');
    localStorage.setItem('psaipay_tenant_db', merchant.tenantDbName || '');
    localStorage.setItem('psaipay_email', regEmail);
    setToken(t);
    setUsername(regEmail);
    setRole(merchant.role || 'tenant');
    setMerchantId(merchant.id || '');
    setTenantDbName(merchant.tenantDbName || '');
    setEmail(regEmail);
  };

  const logout = () => {
    localStorage.removeItem('psaipay_token');
    localStorage.removeItem('psaipay_user');
    localStorage.removeItem('psaipay_role');
    localStorage.removeItem('psaipay_merchant_id');
    localStorage.removeItem('psaipay_tenant_db');
    localStorage.removeItem('psaipay_email');
    setToken(null);
    setUsername(null);
    setRole(null);
    setMerchantId(null);
    setTenantDbName(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, username, role, merchantId, tenantDbName, email, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
