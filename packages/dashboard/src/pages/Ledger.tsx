import React from 'react';
import { Table, Card, Typography, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Ledger() {
  const { data, isLoading } = useQuery({ queryKey: ['ledger'], queryFn: () => api.get('/ledger').then(r => r.data) });

  const columns = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => v?.slice(0, 8) + '...' },
    { title: 'Debit Account', dataIndex: 'accountDebit' },
    { title: 'Credit Account', dataIndex: 'accountCredit' },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `฿${Number(v).toLocaleString()}` },
    { title: 'Currency', dataIndex: 'currency', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <Card>
      <Title level={4}>Double-Entry Ledger</Title>
      <Table dataSource={data?.data || []} columns={columns} loading={isLoading} rowKey="id" />
    </Card>
  );
}
