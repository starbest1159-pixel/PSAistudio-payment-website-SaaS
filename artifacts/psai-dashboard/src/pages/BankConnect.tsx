import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Card, Typography, Tag, Popconfirm, InputNumber, Space, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const { Title, Text } = Typography;

const BANK_COLORS: Record<string, string> = { BBL: '#1E3A8A', KBANK: '#006633', KTB: '#00AEEF', BAY: '#B8860B', SCB: '#4B0082', TMB: '#003087', UOB: '#003893', GSB: '#C71585' };

type VerificationStatus = 'pending' | 'deposit_sent' | 'verified' | 'rejected';

const VERIFICATION_BADGE: Record<VerificationStatus, { color: string; label: string }> = {
  pending: { color: 'gold', label: 'Pending' },
  deposit_sent: { color: 'blue', label: 'Deposit Sent' },
  verified: { color: 'green', label: 'Verified' },
  rejected: { color: 'red', label: 'Rejected' },
};

export default function BankConnect() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConnectionId, setConfirmConnectionId] = useState<string | null>(null);
  const [confirmAmount, setConfirmAmount] = useState<number | null>(null);
  const [form] = Form.useForm();

  const { data: banks } = useQuery({ queryKey: ['bankList'], queryFn: () => api.get('/banks/list').then(r => r.data) });
  const { data: connections, isLoading } = useQuery({ queryKey: ['bankConnections'], queryFn: () => api.get('/banks/connections').then(r => r.data) });

  const create = useMutation({
    mutationFn: (v: any) => api.post('/banks/connections', v).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bankConnections'] }); setOpen(false); form.resetFields(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete('/banks/connections/' + id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bankConnections'] }),
  });

  const sendVerification = useMutation({
    mutationFn: (id: string) => api.post(`/banks/connections/${id}/send-verification`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bankConnections'] });
      message.success(data.message || 'Verification deposit sent');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error || 'Failed to send verification');
    },
  });

  const confirmVerification = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post(`/banks/connections/${id}/confirm-verification`, { amount }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bankConnections'] });
      setConfirmModalVisible(false);
      setConfirmConnectionId(null);
      setConfirmAmount(null);
      if (data.verificationStatus === 'verified') {
        message.success('Bank account verified successfully!');
      } else if (data.verificationStatus === 'rejected') {
        message.error('Verification rejected. Maximum attempts exceeded.');
      } else {
        message.warning(data.message || 'Amount does not match. Please try again.');
      }
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error || 'Failed to confirm verification');
    },
  });

  const handleConfirmVerification = () => {
    if (confirmConnectionId && confirmAmount !== null) {
      confirmVerification.mutate({ id: confirmConnectionId, amount: confirmAmount });
    }
  };

  const columns = [
    {
      title: 'Bank',
      dataIndex: 'bankCode',
      render: (v: string) => <Tag color={BANK_COLORS[v] || '#333'}>{v}</Tag>,
    },
    { title: 'Account No.', dataIndex: 'accountNumber' },
    { title: 'Account Name', dataIndex: 'accountName' },
    {
      title: 'Active',
      dataIndex: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Verification',
      dataIndex: 'verificationStatus',
      render: (status: VerificationStatus, record: any) => {
        const badge = VERIFICATION_BADGE[status] || VERIFICATION_BADGE.pending;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={badge.color}>{badge.label}</Tag>
            {record.verificationDepositAmount && status === 'deposit_sent' && (
              <Text type="secondary" style={{ fontSize: 11 }}>Deposit sent</Text>
            )}
            {record.verificationAttempts > 0 && status !== 'verified' && (
              <Text type="warning" style={{ fontSize: 11 }}>Attempts: {record.verificationAttempts}/3</Text>
            )}
            {status === 'rejected' && record.rejectionReason && (
              <Text type="danger" style={{ fontSize: 11 }}>{record.rejectionReason}</Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space>
          {r.verificationStatus === 'pending' && (
            <Button
              type="primary"
              size="small"
              loading={sendVerification.isPending}
              onClick={() => sendVerification.mutate(r.id)}
            >
              Send Verification
            </Button>
          )}
          {r.verificationStatus === 'deposit_sent' && (
            <Button
              type="primary"
              size="small"
              ghost
              onClick={() => {
                setConfirmConnectionId(r.id);
                setConfirmAmount(null);
                setConfirmModalVisible(true);
              }}
            >
              Confirm Verification
            </Button>
          )}
          <Popconfirm title="Disconnect?" onConfirm={() => remove.mutate(r.id)}>
            <Button danger size="small">Disconnect</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Title level={4}>Bank Connections — 8 Thai Banks</Title>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(banks || []).map((b: any) => <Tag key={b.code} color={BANK_COLORS[b.code] || '#333'} style={{ padding: '4px 12px' }}>{b.code} — {b.name}</Tag>)}
      </div>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>Add Connection</Button>
      <Table dataSource={connections || []} columns={columns} loading={isLoading} rowKey="id" />

      {/* Add Connection Modal */}
      <Modal title="Add Bank Connection" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={v => create.mutate(v)}>
          <Form.Item name="bankCode" label="Bank" rules={[{ required: true }]}>
            <Select options={(banks || []).map((b: any) => ({ value: b.code, label: b.name }))} />
          </Form.Item>
          <Form.Item name="accountNumber" label="Account Number" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accountName" label="Account Name"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* Confirm Verification Modal */}
      <Modal
        title="Confirm Verification Deposit"
        open={confirmModalVisible}
        onOk={handleConfirmVerification}
        onCancel={() => { setConfirmModalVisible(false); setConfirmConnectionId(null); setConfirmAmount(null); }}
        okButtonProps={{ disabled: confirmAmount === null || confirmAmount === undefined }}
        confirmLoading={confirmVerification.isPending}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Please enter the small deposit amount (in THB) you received in your bank account.</Text>
          <br />
          <Text type="secondary">The amount should be between 0.01 and 0.99 THB.</Text>
        </div>
        <InputNumber
          style={{ width: '100%' }}
          min={0.01}
          max={0.99}
          step={0.01}
          precision={2}
          placeholder="0.00"
          value={confirmAmount}
          onChange={(v) => setConfirmAmount(v)}
          addonBefore="฿"
        />
      </Modal>
    </Card>
  );
}
