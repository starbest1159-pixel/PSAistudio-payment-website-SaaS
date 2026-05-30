import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Card, Typography, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function FxRates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['fxRates'],
    queryFn: () => api.get('/fx/rates').then(r => r.data),
  });

  const addRate = useMutation({
    mutationFn: (v: any) => api.post('/fx/rates', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fxRates'] }); setOpen(false); form.resetFields(); },
  });

  const columns = [
    {
      title: 'Base',
      dataIndex: 'baseCurrency',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Quote',
      dataIndex: 'quoteCurrency',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      render: (v: string) => Number(v).toFixed(4),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      render: (v: string) => <Tag color="blue">{v || 'manual'}</Tag>,
    },
    {
      title: 'Effective',
      dataIndex: 'effectiveAt',
      render: (v: string) => new Date(v).toLocaleString(),
    },
  ];

  return (
    <Card>
      <Title level={4}>Foreign Exchange Rates</Title>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>Add Rate</Button>
      </Space>
      <Table dataSource={data?.data || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Add FX Rate" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => addRate.mutate(v)}>
          <Form.Item name="baseCurrency" label="Base Currency" rules={[{ required: true }]}>
            <Select options={[
              { value: 'THB', label: 'THB — Thai Baht' },
              { value: 'USD', label: 'USD — US Dollar' },
              { value: 'EUR', label: 'EUR — Euro' },
              { value: 'JPY', label: 'JPY — Japanese Yen' },
              { value: 'GBP', label: 'GBP — British Pound' },
              { value: 'CNY', label: 'CNY — Chinese Yuan' },
            ]} />
          </Form.Item>
          <Form.Item name="quoteCurrency" label="Quote Currency" rules={[{ required: true }]}>
            <Select options={[
              { value: 'THB', label: 'THB — Thai Baht' },
              { value: 'USD', label: 'USD — US Dollar' },
              { value: 'EUR', label: 'EUR — Euro' },
              { value: 'JPY', label: 'JPY — Japanese Yen' },
              { value: 'GBP', label: 'GBP — British Pound' },
              { value: 'CNY', label: 'CNY — Chinese Yuan' },
            ]} />
          </Form.Item>
          <Form.Item name="rate" label="Rate" rules={[{ required: true }]}>
            <Input placeholder="e.g. 35.2500 for USD/THB" />
          </Form.Item>
          <Form.Item name="source" label="Source">
            <Input placeholder="BOT, manual, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
