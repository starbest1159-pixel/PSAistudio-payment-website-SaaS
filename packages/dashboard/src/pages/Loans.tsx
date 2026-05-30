import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Card, Typography, Space, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Loans() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['loans', statusFilter],
    queryFn: () => api.get('/loans', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (v: any) => api.post('/loans', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); setOpen(false); form.resetFields(); },
  });

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      render: (v: string) => v?.slice(0, 8) + '...',
    },
    {
      title: 'Principal',
      dataIndex: 'principal',
      render: (v: string) => `฿${Number(v).toLocaleString()}`,
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstandingBalance',
      render: (v: string) => `฿${Number(v).toLocaleString()}`,
    },
    {
      title: 'Rate',
      dataIndex: 'interestRate',
      render: (v: string) => `${(Number(v) * 100).toFixed(2)}%`,
    },
    {
      title: 'Term',
      dataIndex: 'term',
      render: (v: number) => `${v} months`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'originated' ? 'blue' : v === 'completed' ? 'default' : 'red'}>{v}</Tag>,
    },
    {
      title: 'Disbursed',
      dataIndex: 'disbursedAt',
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
  ];

  return (
    <Card>
      <Title level={4}>Loan Management</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 160 }}
          onChange={v => setStatusFilter(v || undefined)}
          options={[
            { value: 'originated', label: 'Originated' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'defaulted', label: 'Defaulted' },
          ]}
        />
        <Button type="primary" onClick={() => setOpen(true)}>Originate Loan</Button>
      </Space>
      <Table dataSource={data?.data || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Originate Loan" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)} width={600}>
        <Form form={form} layout="vertical" onFinish={v => create.mutate(v)}>
          <Form.Item name="accountId" label="Account ID" rules={[{ required: true }]}><Input placeholder="UUID of the borrower account" /></Form.Item>
          <Form.Item name="principal" label="Principal (THB)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} precision={2} /></Form.Item>
          <Form.Item name="interestRate" label="Annual Interest Rate" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={1} step={0.01} placeholder="e.g. 0.05 for 5%" /></Form.Item>
          <Form.Item name="term" label="Term (months)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} max={360} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
