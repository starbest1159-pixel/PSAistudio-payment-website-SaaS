import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Typography, Image, Alert } from 'antd';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

const { Title, Text } = Typography;

export default function QRGenerator() {
  const [result, setResult] = useState<{ qrImage: string; payload: string } | null>(null);
  const [form] = Form.useForm();

  const generate = useMutation({
    mutationFn: (v: any) => api.post('/qr/generate', v).then(r => r.data),
    onSuccess: (d) => setResult(d),
  });

  return (
    <Card>
      <Title level={4}>PromptPay QR Generator</Title>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <Form form={form} layout="vertical" onFinish={v => generate.mutate(v)}>
            <Form.Item name="type" label="Type" initialValue="phone">
              <Select options={[{ value: 'phone', label: 'Phone Number' }, { value: 'taxid', label: 'Tax ID / National ID' }, { value: 'ewallet', label: 'E-Wallet' }]} />
            </Form.Item>
            <Form.Item name="id" label="ID / Phone / Tax ID" rules={[{ required: true }]}><Input placeholder="0812345678" /></Form.Item>
            <Form.Item name="amount" label="Amount (THB)"><InputNumber style={{ width: '100%' }} min={0} precision={2} /></Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={generate.isPending}>Generate QR</Button>
            </Form.Item>
          </Form>
          {generate.isError && <Alert message="Generation failed" type="error" />}
        </div>
        {result && (
          <div style={{ textAlign: 'center' }}>
            <Image src={result.qrImage} width={280} />
            <div style={{ marginTop: 8 }}>
              <Text copyable style={{ fontSize: 10, wordBreak: 'break-all' }}>{result.payload}</Text>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
