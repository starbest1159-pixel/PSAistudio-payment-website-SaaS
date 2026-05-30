import React from 'react';
import { Card, Typography, Table, Tag, Badge, Row, Col, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const { Title } = Typography;

export default function BotStatus() {
  const { data: bots, isLoading: botsLoading } = useQuery({ queryKey: ['botStatus'], queryFn: () => api.get('/bot/status').then(r => r.data) });
  const { data: jobs, isLoading: jobsLoading } = useQuery({ queryKey: ['botJobs'], queryFn: () => api.get('/bot/jobs').then(r => r.data) });

  const botColumns = [
    { title: 'Bot ID', dataIndex: 'id' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Bank', dataIndex: 'bank', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Badge status={v === 'running' ? 'processing' : 'default'} text={v} /> },
    { title: 'Jobs Done', dataIndex: 'jobsCompleted' },
    { title: 'Last Seen', dataIndex: 'lastSeen', render: (v: string) => new Date(v).toLocaleString() },
  ];

  const jobColumns = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => v?.slice(0, 8) + '...' },
    { title: 'Bot', dataIndex: 'botId' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'gold'}>{v}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>RPA Bot Status</Title>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Statistic title="Total Bots" value={bots?.length || 0} /></Col>
          <Col span={8}><Statistic title="Running" value={bots?.filter((b: any) => b.status === 'running').length || 0} valueStyle={{ color: '#52c41a' }} /></Col>
          <Col span={8}><Statistic title="Pending Jobs" value={jobs?.filter((j: any) => j.status === 'queued').length || 0} valueStyle={{ color: '#faad14' }} /></Col>
        </Row>
        <Table dataSource={bots || []} columns={botColumns} loading={botsLoading} rowKey="id" pagination={false} />
      </Card>
      <Card>
        <Title level={5}>Job Queue</Title>
        <Table dataSource={jobs || []} columns={jobColumns} loading={jobsLoading} rowKey="id" />
      </Card>
    </div>
  );
}
