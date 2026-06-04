import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Card, Typography, Tag, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

const BANK_COLORS: Record<string, string> = { BBL: '#1E3A8A', KBANK: '#006633', KTB: '#00AEEF', BAY: '#B8860B', SCB: '#4B0082', TMB: '#003087', UOB: '#003893', GSB: '#C71585' };

export default function BankConnect() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { data: banks } = useQuery({ queryKey: ['bankList'], queryFn: () => api.get('/banks/list').then(r => r.data) });
  const { data: connections, isLoading } = useQuery({ queryKey: ['bankConnections'], queryFn: () => api.get('/banks/connections').then(r => r.data) });
  const create = useMutation({ mutationFn: (v: any) => api.post('/banks/connections', v).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bankConnections'] }); setOpen(false); form.resetFields(); } });
  const remove = useMutation({ mutationFn: (id: string) => api.delete('/banks/connections/' + id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['bankConnections'] }) });

  const columns = [
    { title: 'Bank', dataIndex: 'bankCode', render: (v: string) => <Tag color={BANK_COLORS[v] || '#333'}>{v}</Tag> },
    { title: 'Account No.', dataIndex: 'accountNumber' },
    { title: 'Account Name', dataIndex: 'accountName' },
    { title: 'Status', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Actions', render: (_: any, r: any) => <Popconfirm title="Disconnect?" onConfirm={() => remove.mutate(r.id)}><Button danger size="small">Disconnect</Button></Popconfirm> },
  ];

  return (
    <Card>
      <Title level={4}>Bank Connections — 8 Thai Banks</Title>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(banks || []).map((b: any) => <Tag key={b.code} color={BANK_COLORS[b.code] || '#333'} style={{ padding: '4px 12px' }}>{b.code} — {b.name}</Tag>)}
      </div>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>Add Connection</Button>
      <Table dataSource={connections || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Add Bank Connection" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => create.mutate(v)}>
          <Form.Item name="bankCode" label="Bank" rules={[{ required: true }]}>
            <Select options={(banks || []).map((b: any) => ({ value: b.code, label: b.name }))} />
          </Form.Item>
          <Form.Item name="accountNumber" label="Account Number" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accountName" label="Account Name"><Input /></Form.Item>
          <Form.Item name="merchantId" label="Merchant ID"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
