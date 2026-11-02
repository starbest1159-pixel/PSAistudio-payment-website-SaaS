import React from 'react';
import { Form, Input, Switch, InputNumber, Button, Card, Typography, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Settings() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [msg, msgCtx] = message.useMessage();

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
    onSuccess: (d: any) => form.setFieldsValue(d)
  } as any);

  const save = useMutation({
    mutationFn: (v: any) => api.patch('/settings', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); msg.success('Settings saved'); }
  });

  return (
    <Card>
      {msgCtx}
      <Title level={4}>System Settings</Title>
      <Form form={form} layout="vertical" onFinish={v => save.mutate(v)} style={{ maxWidth: 600 }}>
        <Form.Item name="webhookUrl" label="Default Webhook URL"><Input placeholder="https://example.com/webhook" /></Form.Item>
        <Form.Item name="webhookSecret" label="Webhook HMAC Secret"><Input.Password /></Form.Item>
        <Form.Item name="autoApproveEnabled" label="Auto-Approve Withdrawals" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="autoApproveLimit" label="Auto-Approve Limit (THB)"><InputNumber style={{ width: '100%' }} min={0} precision={2} /></Form.Item>
        <Form.Item name="promptpayId" label="Default PromptPay ID"><Input placeholder="0812345678 or 1234567890123" /></Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={save.isPending}>Save Settings</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
