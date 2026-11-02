import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Switch, Tag, Card, Typography, Popconfirm, Row, Col, Statistic } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function Risk() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { data: rules, isLoading } = useQuery({ queryKey: ['riskRules'], queryFn: () => api.get('/risk/rules').then(r => r.data) });
  const { data: analysis } = useQuery({ queryKey: ['riskAnalysis'], queryFn: () => api.get('/risk/analysis').then(r => r.data) });
  const create = useMutation({ mutationFn: (v: any) => api.post('/risk/rules', v).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['riskRules'] }); setOpen(false); form.resetFields(); } });
  const remove = useMutation({ mutationFn: (id: string) => api.delete('/risk/rules/' + id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['riskRules'] }) });

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Condition', dataIndex: 'condition' },
    { title: 'Action', dataIndex: 'action', render: (v: string) => <Tag color={v === 'block' ? 'red' : 'orange'}>{v}</Tag> },
    { title: 'Severity', dataIndex: 'severity' },
    { title: 'Active', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Actions', render: (_: any, r: any) => <Popconfirm title="Delete?" onConfirm={() => remove.mutate(r.id)}><Button size="small" danger>Delete</Button></Popconfirm> },
  ];

  return (
    <Card>
      <Title level={4}>Risk Management</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="Risk Score" value={analysis?.score || 0} suffix="/ 100" valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Active Flags" value={analysis?.flags?.length || 0} /></Card></Col>
        <Col span={8}><Card><Statistic title="Rules Count" value={rules?.length || 0} /></Card></Col>
      </Row>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>Add Rule</Button>
      <Table dataSource={rules || []} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title="Add Risk Rule" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => create.mutate(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type"><Select options={[{ value: 'amount', label: 'Amount' }, { value: 'velocity', label: 'Velocity' }, { value: 'pattern', label: 'Pattern' }]} /></Form.Item>
          <Form.Item name="condition" label="Condition" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="action" label="Action"><Select options={[{ value: 'flag', label: 'Flag' }, { value: 'block', label: 'Block' }, { value: 'review', label: 'Review' }]} /></Form.Item>
          <Form.Item name="severity" label="Severity" initialValue={1}><InputNumber min={1} max={5} /></Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
