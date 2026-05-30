import React, { useState } from 'react';
import { Table, Tag, Card, Typography, Space, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function BotMessages() {
  const [directionFilter, setDirectionFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['botMessages', directionFilter],
    queryFn: () => api.get('/bot-messages', { params: { direction: directionFilter || undefined } }).then(r => r.data),
  });

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      render: (v: string) => v?.slice(0, 8) + '...',
    },
    {
      title: 'Type',
      dataIndex: 'messageType',
      render: (v: string) => <Tag color={v === 'pain001' ? 'blue' : v === 'pacs008' ? 'green' : v === 'pacs009' ? 'orange' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Direction',
      dataIndex: 'direction',
      render: (v: string) => <Tag color={v === 'outbound' ? 'blue' : 'green'}>{v}</Tag>,
    },
    {
      title: 'Correlation ID',
      dataIndex: 'correlationId',
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={v === 'sent' ? 'blue' : v === 'acknowledged' ? 'green' : v === 'rejected' ? 'red' : 'gold'}>{v}</Tag>,
    },
    {
      title: 'Sender BIC',
      dataIndex: 'senderBic',
    },
    {
      title: 'Receiver BIC',
      dataIndex: 'receiverBic',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: 'Processed',
      dataIndex: 'processedAt',
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
  ];

  return (
    <Card>
      <Title level={4}>BOT ISO 20022 Messages</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Direction"
          allowClear
          style={{ width: 160 }}
          onChange={v => setDirectionFilter(v || undefined)}
          options={[
            { value: 'inbound', label: 'Inbound' },
            { value: 'outbound', label: 'Outbound' },
          ]}
        />
      </Space>
      <Table dataSource={data?.data || []} columns={columns} loading={isLoading} rowKey="id" />
    </Card>
  );
}
