import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Typography, Space } from 'antd';
import {
  DashboardOutlined, TransactionOutlined, BankOutlined, ArrowDownOutlined,
  ArrowUpOutlined, TeamOutlined, QrcodeOutlined, FileImageOutlined,
  ApiOutlined, AlertOutlined, AccountBookOutlined, RobotOutlined,
  GlobalOutlined, SettingOutlined, LogoutOutlined, BookOutlined,
  CreditCardOutlined, DollarOutlined, SwapOutlined, MessageOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/accounts', icon: <AccountBookOutlined />, label: 'Accounts' },
  { key: '/transactions', icon: <TransactionOutlined />, label: 'Transactions' },
  { key: '/deposits', icon: <ArrowDownOutlined />, label: 'Deposits' },
  { key: '/withdrawals', icon: <ArrowUpOutlined />, label: 'Withdrawals' },
  { key: '/merchants', icon: <TeamOutlined />, label: 'Merchants' },
  { key: '/loans', icon: <DollarOutlined />, label: 'Loans' },
  { key: '/cards', icon: <CreditCardOutlined />, label: 'Cards' },
  { key: '/fx', icon: <SwapOutlined />, label: 'FX Rates' },
  { key: '/qr', icon: <QrcodeOutlined />, label: 'QR Generator' },
  { key: '/slip', icon: <FileImageOutlined />, label: 'Slip Verify' },
  { key: '/banks', icon: <BankOutlined />, label: 'Bank Connect' },
  { key: '/risk', icon: <AlertOutlined />, label: 'Risk' },
  { key: '/ledger', icon: <AccountBookOutlined />, label: 'Ledger' },
  { key: '/bot', icon: <RobotOutlined />, label: 'Bot Status' },
  { key: '/bot-messages', icon: <MessageOutlined />, label: 'BOT Messages' },
  { key: '/webhooks', icon: <GlobalOutlined />, label: 'Webhooks' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  { key: '/api-docs', icon: <BookOutlined />, label: 'API Docs' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAuth();

  // Find the matching top-level route key for menu selection
  const selectedKey = '/' + (location.pathname.split('/')[1] || '');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} style={{ background: '#001529' }} width={220}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#002040', margin: '8px' }}>
          {!collapsed && <Text strong style={{ color: '#ffffff', fontSize: 16 }}>PSAiPay</Text>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#ffffff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 18 }}>PSAiPay — Thai Commercial Banking</Text>
          <Space>
            <Avatar style={{ background: '#1677ff' }}>{username?.[0]?.toUpperCase()}</Avatar>
            <Text>{username}</Text>
            <Button icon={<LogoutOutlined />} onClick={logout} type="text">Logout</Button>
          </Space>
        </Header>
        <Content style={{ margin: 24, background: '#ffffff', padding: 24, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
