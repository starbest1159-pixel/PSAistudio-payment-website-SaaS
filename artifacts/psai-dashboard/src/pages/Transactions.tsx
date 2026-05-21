import React, { useState } from 'react';
import { Table, Select, Space, Tag, Typography, Card } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Transactions() {
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', status, type],
    queryFn: () => api.get('/transactions', { params: { status: status || undefined, type: type || undefined } }).then(r => r.data)
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => v?.slice(0, 8) + '...' },
    { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `฿${Number(v).toLocaleString()}` },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : v === 'pending' ? 'gold' : 'red'}>{v}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <Card>
      <Title level={4}>Transactions</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Status" allowClear style={{ width: 140 }} onChange={v => setStatus(v || '')} options={[{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }]} />
        <Select placeholder="Type" allowClear style={{ width: 140 }} onChange={v => setType(v || '')} options={[{ value: 'deposit', label: 'Deposit' }, { value: 'withdrawal', label: 'Withdrawal' }]} />
      </Space>
      <Table dataSource={data?.data || []} columns={columns} loading={isLoading} rowKey="id" />
    </Card>
  );
}
