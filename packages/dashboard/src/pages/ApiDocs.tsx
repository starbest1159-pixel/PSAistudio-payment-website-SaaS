import React from 'react';
import { Card, Typography, Collapse, Tag, Table } from 'antd';

const { Title, Text, Paragraph } = Typography;

const endpoints = [
  { method: 'POST', path: '/api/auth/login', desc: 'Admin login, returns JWT token' },
  { method: 'GET', path: '/api/merchants', desc: 'List all merchants' },
  { method: 'POST', path: '/api/merchants', desc: 'Create merchant' },
  { method: 'GET', path: '/api/transactions', desc: 'List transactions (filterable)' },
  { method: 'GET', path: '/api/deposits', desc: 'List deposits' },
  { method: 'POST', path: '/api/deposits', desc: 'Create deposit with QR code' },
  { method: 'GET', path: '/api/withdrawals', desc: 'List withdrawals' },
  { method: 'POST', path: '/api/withdrawals', desc: 'Create withdrawal (auto-approve if under limit)' },
  { method: 'PATCH', path: '/api/withdrawals/:id/approve', desc: 'Manual approve withdrawal' },
  { method: 'GET', path: '/api/risk/rules', desc: 'List risk rules' },
  { method: 'POST', path: '/api/qr/generate', desc: 'Generate PromptPay QR (EMV, CRC16-CCITT)' },
  { method: 'POST', path: '/api/slip/verify', desc: 'Verify slip via SHA-256 dedup' },
  { method: 'GET', path: '/api/banks/list', desc: 'Get 8 Thai bank list' },
  { method: 'GET', path: '/api/dashboard/kpis', desc: 'KPI summary' },
  { method: 'GET', path: '/api/bot/status', desc: 'RPA bot status' },
  { method: 'POST', path: '/api/webhooks/test', desc: 'Send test webhook (HMAC-SHA256 signed)' },
  { method: 'GET', path: '/api/settings', desc: 'Get system settings' },
  { method: 'PATCH', path: '/api/settings', desc: 'Update system settings' },
];

const methodColor: Record<string, string> = { GET: '#52c41a', POST: '#1677ff', PATCH: '#faad14', DELETE: '#ff4d4f', PUT: '#722ed1' };

const cols = [
  { title: 'Method', dataIndex: 'method', render: (v: string) => <Tag color={methodColor[v] || '#333'}>{v}</Tag> },
  { title: 'Path', dataIndex: 'path', render: (v: string) => <Text code>{v}</Text> },
  { title: 'Description', dataIndex: 'desc' },
];

export default function ApiDocs() {
  return (
    <Card>
      <Title level={4}>PSAiPay API Documentation</Title>
      <Paragraph>Base URL: <Text code>http://localhost:4000</Text> — All endpoints require <Text code>Authorization: Bearer TOKEN</Text> except <Text code>/api/auth/login</Text></Paragraph>
      <Collapse defaultActiveKey={['1']} items={[{
        key: '1', label: 'Authentication', children: (
          <div>
            <Paragraph>Login: <Text code>POST /api/auth/login</Text> with body: <Text code>{JSON.stringify({ username: 'admin', password: 'admin123' })}</Text></Paragraph>
            <Paragraph>Use the returned <Text code>token</Text> as Bearer token in all subsequent requests.</Paragraph>
          </div>
        )
      }, {
        key: '2', label: 'All Endpoints', children: <Table dataSource={endpoints} columns={cols} pagination={false} rowKey="path" size="small" />
      }, {
        key: '3', label: 'PromptPay QR', children: (
          <Paragraph>POST <Text code>/api/qr/generate</Text> with body: <Text code>{JSON.stringify({ type: 'phone', id: '0812345678', amount: 100 })}</Text> — Returns EMV QR payload with CRC16-CCITT checksum.</Paragraph>
        )
      }, {
        key: '4', label: 'Webhooks', children: (
          <Paragraph>All webhook dispatches are signed with HMAC-SHA256. Verify signature from header <Text code>X-PSAiPay-Signature</Text> using your webhook secret.</Paragraph>
        )
      }]} />
    </Card>
  );
}
