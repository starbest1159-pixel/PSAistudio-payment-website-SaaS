import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import api from '../lib/api';

const { Title } = Typography;

export default function Dashboard() {
  const { data: kpis } = useQuery({ queryKey: ['kpis'], queryFn: () => api.get('/dashboard/kpis').then(r => r.data) });
  const { data: volume } = useQuery({ queryKey: ['volume'], queryFn: () => api.get('/dashboard/volume').then(r => r.data) });
  const { data: activity } = useQuery({ queryKey: ['activity'], queryFn: () => api.get('/dashboard/activity').then(r => r.data) });

  const cols = [
    { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag color={v === 'deposit' ? 'green' : 'orange'}>{v}</Tag> },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `฿${v.toLocaleString()}` },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'gold'}>{v}</Tag> },
  ];

  return (
    <div>
      <Title level={4}>Dashboard</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Today Volume" value={kpis?.todayVolume || 0} prefix="฿" precision={0} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Today Transactions" value={kpis?.todayTransactions || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="Pending Withdrawals" value={kpis?.pendingWithdrawals || 0} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Success Rate" value={kpis?.successRate || 0} suffix="%" precision={1} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="7-Day Volume">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={volume || []}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v: number) => `฿${v.toLocaleString()}`} />
                <Bar dataKey="deposits" fill="#1677ff" name="Deposits" />
                <Bar dataKey="withdrawals" fill="#52c41a" name="Withdrawals" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Recent Activity">
            <Table dataSource={activity || []} columns={cols} pagination={false} size="small" rowKey="id" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
