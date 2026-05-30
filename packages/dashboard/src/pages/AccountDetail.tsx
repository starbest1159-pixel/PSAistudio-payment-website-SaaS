import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Descriptions, Table, Tag, Row, Col, Statistic, Button, Space, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: () => api.get(`/accounts/${id}`).then(r => r.data),
  });

  const { data: balance } = useQuery({
    queryKey: ['accountBalance', id],
    queryFn: () => api.get(`/accounts/${id}/balance`).then(r => r.data),
  });

  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ['accountStatement', id],
    queryFn: () => api.get(`/accounts/${id}/statement`, { params: { limit: 20 } }).then(r => r.data),
  });

  const freeze = useMutation({
    mutationFn: () => api.patch(`/accounts/${id}/freeze`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', id] }),
  });

  const unfreeze = useMutation({
    mutationFn: () => api.patch(`/accounts/${id}/unfreeze`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', id] }),
  });

  const close = useMutation({
    mutationFn: () => api.patch(`/accounts/${id}/close`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', id] }),
  });

  if (accountLoading) return <Card loading />;

  const statementColumns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: 'Type',
      dataIndex: 'entryType',
      render: (v: string) => <Tag color={v === 'credit' ? 'green' : 'red'}>{v.toUpperCase()}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v: string, r: any) => `${r.entryType === 'credit' ? '+' : '-'}฿${Number(v).toLocaleString()}`,
    },
    {
      title: 'Ledger Type',
      dataIndex: 'ledgerType',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfterEntry',
      render: (v: string) => `฿${Number(v).toLocaleString()}`,
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="Balance" value={balance?.balance || '0'} prefix="฿" precision={2} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Available" value={account?.availableBalance || '0'} prefix="฿" precision={2} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Status" value={account?.status || 'N/A'} valueStyle={{ color: account?.status === 'active' ? '#52c41a' : account?.status === 'frozen' ? '#faad14' : '#ff4d4f' }} /></Card>
        </Col>
        <Col span={6}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>Actions</Title>
              {account?.status === 'active' && (
                <Popconfirm title="Freeze this account?" onConfirm={() => freeze.mutate()}>
                  <Button danger block>Freeze Account</Button>
                </Popconfirm>
              )}
              {account?.status === 'frozen' && (
                <Popconfirm title="Unfreeze this account?" onConfirm={() => unfreeze.mutate()}>
                  <Button type="primary" block>Unfreeze Account</Button>
                </Popconfirm>
              )}
              {account?.status === 'active' && (
                <Popconfirm title="Close this account? Requires zero balance." onConfirm={() => close.mutate()}>
                  <Button type="primary" danger block>Close Account</Button>
                </Popconfirm>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions title="Account Details" bordered column={3}>
          <Descriptions.Item label="Account Number">{account?.accountNumber}</Descriptions.Item>
          <Descriptions.Item label="Type">{account?.type}</Descriptions.Item>
          <Descriptions.Item label="Currency">{account?.currency}</Descriptions.Item>
          <Descriptions.Item label="Customer ID">{account?.customerId || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Created">{account?.createdAt ? new Date(account.createdAt).toLocaleString() : 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Status"><Tag color={account?.status === 'active' ? 'green' : account?.status === 'frozen' ? 'orange' : 'red'}>{account?.status}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Title level={4}>Transaction History</Title>
        <Table
          dataSource={statement?.data || []}
          columns={statementColumns}
          loading={statementLoading}
          rowKey="id"
          pagination={{ pageSize: 10, total: statement?.total || 0 }}
        />
      </Card>
    </div>
  );
}
