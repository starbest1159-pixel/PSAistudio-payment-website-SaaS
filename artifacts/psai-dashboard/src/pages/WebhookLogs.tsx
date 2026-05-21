import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Card, Typography, Tag } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function WebhookLogs() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['webhookLogs'], queryFn: () => api.get('/webhooks/logs').then(r => r.data) });

  const test = useMutation({
    mutationFn: (v: any) => api.post('/webhooks/test', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhookLogs'] }); setOpen(false); form.resetFields(); }
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => v?.slice(0, 8) + '...' },
    { title: 'Event', dataIndex: 'event', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'URL', dataIndex: 'url', render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
    { title: 'Status', dataIndex: 'statusCode' },
    { title: 'Result', dataIndex: 'success', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Success' : 'Failed'}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <Card>
      <Title level={4}>Webhook Logs</Title>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>Send Test Webhook</Button>
      <Table dataSource={data || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Send Test Webhook" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)} confirmLoading={test.isPending}>
        <Form form={form} layout="vertical" onFinish={v => test.mutate(v)}>
          <Form.Item name="url" label="Target URL" rules={[{ required: true }]}><Input placeholder="https://example.com/webhook" /></Form.Item>
          <Form.Item name="event" label="Event" rules={[{ required: true }]}><Input placeholder="deposit.completed" /></Form.Item>
          <Form.Item name="secret" label="HMAC Secret"><Input placeholder="leave blank for default" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
