import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Tag, Card, Typography, Space, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Merchants() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['merchants'], queryFn: () => api.get('/merchants').then(r => r.data) });
  const create = useMutation({ mutationFn: (v: any) => api.post('/merchants', v).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['merchants'] }); setOpen(false); form.resetFields(); } });
  const remove = useMutation({ mutationFn: (id: string) => api.delete('/merchants/' + id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['merchants'] }) });

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Code', dataIndex: 'code' },
    { title: 'PromptPay ID', dataIndex: 'promptpayId' },
    { title: 'Status', dataIndex: 'isActive', render: (v: boolean) => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
    { title: 'Actions', render: (_: any, r: any) => <Popconfirm title="Delete?" onConfirm={() => remove.mutate(r.id)}><Button size="small" danger>Delete</Button></Popconfirm> },
  ];

  return (
    <Card>
      <Title level={4}>Merchants</Title>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>Add Merchant</Button>
      <Table dataSource={data || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Add Merchant" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => create.mutate(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="promptpayId" label="PromptPay ID"><Input /></Form.Item>
          <Form.Item name="webhookUrl" label="Webhook URL"><Input /></Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
