import React from 'react';
import { Table, Button, Tag, Card, Typography, Space, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Withdrawals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['withdrawals'], queryFn: () => api.get('/withdrawals').then(r => r.data) });

  const approve = useMutation({ mutationFn: (id: string) => api.patch(`/withdrawals/${id}/approve`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['withdrawals'] }) });
  const reject = useMutation({ mutationFn: (id: string) => api.patch(`/withdrawals/${id}/reject`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['withdrawals'] }) });

  const columns = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => v?.slice(0, 8) + '...' },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `฿${Number(v).toLocaleString()}` },
    { title: 'Bank', dataIndex: 'bankCode' },
    { title: 'Account', dataIndex: 'accountNumber' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'approved' ? 'green' : v === 'rejected' ? 'red' : 'gold'}>{v}</Tag> },
    { title: 'Auto', dataIndex: 'autoApproved', render: (v: boolean) => v ? <Tag color="blue">Auto</Tag> : null },
    {
      title: 'Actions', render: (_: any, r: any) => r.status === 'pending' ? (
        <Space>
          <Popconfirm title="Approve?" onConfirm={() => approve.mutate(r.id)}><Button size="small" type="primary">Approve</Button></Popconfirm>
          <Popconfirm title="Reject?" onConfirm={() => reject.mutate(r.id)}><Button size="small" danger>Reject</Button></Popconfirm>
        </Space>
      ) : null
    },
  ];

  return (
    <Card>
      <Title level={4}>Withdrawals</Title>
      <Table dataSource={data || []} columns={columns} loading={isLoading} rowKey="id" />
    </Card>
  );
}
