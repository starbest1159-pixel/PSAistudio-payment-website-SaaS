import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Deposits from './pages/Deposits';
import Withdrawals from './pages/Withdrawals';
import Merchants from './pages/Merchants';
import QRGenerator from './pages/QRGenerator';
import SlipVerify from './pages/SlipVerify';
import BankConnect from './pages/BankConnect';
import Risk from './pages/Risk';
import Ledger from './pages/Ledger';
import BotStatus from './pages/BotStatus';
import WebhookLogs from './pages/WebhookLogs';
import Settings from './pages/Settings';
import ApiDocs from './pages/ApiDocs';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="deposits" element={<Deposits />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="merchants" element={<Merchants />} />
            <Route path="qr" element={<QRGenerator />} />
            <Route path="slip" element={<SlipVerify />} />
            <Route path="banks" element={<BankConnect />} />
            <Route path="risk" element={<Risk />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="bot" element={<BotStatus />} />
            <Route path="webhooks" element={<WebhookLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="api-docs" element={<ApiDocs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
