import React, { useState } from 'react';
import { Table, Button, Modal, Form, Select, Tag, Card, Typography, Space, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Cards() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: () => api.get('/cards').then(r => r.data),
  });

  const issue = useMutation({
    mutationFn: (v: any) => api.post('/cards', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cards'] }); setOpen(false); form.resetFields(); },
  });

  const block = useMutation({
    mutationFn: (id: string) => api.patch(`/cards/${id}/block`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  });

  const unblock = useMutation({
    mutationFn: (id: string) => api.patch(`/cards/${id}/unblock`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  });

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      render: (v: string) => v?.slice(0, 8) + '...',
    },
    {
      title: 'Card Number',
      dataIndex: 'cardNumberMasked',
      render: (v: string, r: any) => v || r.cardNumber?.slice(0, 10) + '...',
    },
    {
      title: 'Type',
      dataIndex: 'cardType',
      render: (v: string) => <Tag color={v === 'credit' ? 'purple' : 'blue'}>{v}</Tag>,
    },
    {
      title: 'Brand',
      dataIndex: 'cardBrand',
      render: (v: string) => <Tag>{v.toUpperCase()}</Tag>,
    },
    {
      title: 'Expiry',
      render: (_: any, r: any) => `${String(r.expiryMonth).padStart(2, '0')}/${r.expiryYear}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'blocked' ? 'orange' : 'red'}>{v}</Tag>,
    },
    {
      title: 'Daily Limit',
      dataIndex: 'dailyLimit',
      render: (v: string) => `฿${Number(v || 0).toLocaleString()}`,
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'active' && (
            <Popconfirm title="Block this card?" onConfirm={() => block.mutate(r.id)}>
              <Button size="small" danger>Block</Button>
            </Popconfirm>
          )}
          {r.status === 'blocked' && (
            <Popconfirm title="Unblock this card?" onConfirm={() => unblock.mutate(r.id)}>
              <Button size="small" type="primary">Unblock</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Title level={4}>Card Management</Title>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>Issue Card</Button>
      <Table dataSource={data?.data || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Issue New Card" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => issue.mutate(v)}>
          <Form.Item name="accountId" label="Account ID" rules={[{ required: true }]}>
            <input className="ant-input" placeholder="UUID of the account" />
          </Form.Item>
          <Form.Item name="cardType" label="Card Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'debit', label: 'Debit' },
              { value: 'credit', label: 'Credit' },
            ]} />
          </Form.Item>
          <Form.Item name="brand" label="Card Brand" rules={[{ required: true }]}>
            <Select options={[
              { value: 'visa', label: 'Visa' },
              { value: 'mastercard', label: 'Mastercard' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
