import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Tag, Card, Typography, Image } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Deposits() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; qrImage?: string; payload?: string }>({ open: false });
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['deposits'], queryFn: () => api.get('/deposits').then(r => r.data) });
  const create = useMutation({
    mutationFn: (v: any) => api.post('/deposits', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deposits'] }); setOpen(false); form.resetFields(); }
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => v?.slice(0, 8) + '...' },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `฿${Number(v).toLocaleString()}` },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'QR', render: (_: any, r: any) => r.qrImage ? <Button size="small" onClick={() => setQrModal({ open: true, qrImage: r.qrImage, payload: r.qrPayload })}>View QR</Button> : null },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <Card>
      <Title level={4}>Deposits</Title>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>New Deposit</Button>
      <Table dataSource={data || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="New Deposit" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => create.mutate(v)}>
          <Form.Item name="merchantId" label="Merchant ID"><Input /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="promptpayId" label="PromptPay ID"><Input placeholder="Phone or Tax ID" /></Form.Item>
        </Form>
      </Modal>
      <Modal title="PromptPay QR Code" open={qrModal.open} onCancel={() => setQrModal({ open: false })} footer={null}>
        {qrModal.qrImage && <div style={{ textAlign: 'center' }}><Image src={qrModal.qrImage} width={280} /><p style={{ wordBreak: 'break-all', fontSize: 10 }}>{qrModal.payload}</p></div>}
      </Modal>
    </Card>
  );
}
