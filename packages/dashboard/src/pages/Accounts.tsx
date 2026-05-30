import React, { useState } from 'react';
import { Table, Button, Modal, Form, Select, Tag, Card, Typography, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const { Title } = Typography;

export default function Accounts() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', typeFilter],
    queryFn: () => api.get('/accounts', { params: { type: typeFilter || undefined } }).then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (v: any) => api.post('/accounts', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setOpen(false); form.resetFields(); },
  });

  const columns = [
    {
      title: 'Account Number',
      dataIndex: 'accountNumber',
      render: (v: string, r: any) => <Button type="link" onClick={() => navigate(`/accounts/${r.id}`)}>{v}</Button>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (v: string) => <Tag color={v === 'savings' ? 'green' : v === 'current' ? 'blue' : 'purple'}>{v}</Tag>,
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      render: (v: string) => `฿${Number(v).toLocaleString()}`,
    },
    {
      title: 'Available',
      dataIndex: 'availableBalance',
      render: (v: string) => `฿${Number(v).toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'frozen' ? 'orange' : 'red'}>{v}</Tag>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerId',
    },
  ];

  return (
    <Card>
      <Title level={4}>Bank Accounts</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Account Type"
          allowClear
          style={{ width: 160 }}
          onChange={v => setTypeFilter(v || undefined)}
          options={[
            { value: 'savings', label: 'Savings' },
            { value: 'current', label: 'Current' },
            { value: 'fx', label: 'Foreign Exchange' },
          ]}
        />
        <Button type="primary" onClick={() => setOpen(true)}>Open Account</Button>
      </Space>
      <Table dataSource={data?.data || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Open Account" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => create.mutate(v)}>
          <Form.Item name="type" label="Account Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'savings', label: 'Savings' },
              { value: 'current', label: 'Current' },
              { value: 'fx', label: 'Foreign Exchange' },
            ]} />
          </Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="THB">
            <Select options={[
              { value: 'THB', label: 'THB — Thai Baht' },
              { value: 'USD', label: 'USD — US Dollar' },
              { value: 'EUR', label: 'EUR — Euro' },
              { value: 'JPY', label: 'JPY — Japanese Yen' },
            ]} />
          </Form.Item>
          <Form.Item name="customerId" label="Customer ID"><Select showSearch options={[]} placeholder="Enter or select customer" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
