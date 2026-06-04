import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const onLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      await login(values.username, values.password);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: { name: string; email: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      await register(values.name, values.email, values.password);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: 420, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: '#1677ff', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text strong style={{ color: '#ffffff', fontSize: 24 }}>P</Text>
          </div>
          <Title level={3} style={{ margin: 0 }}>PSAiPay</Title>
          <Text type="secondary">Multi-Tenant Payment Platform</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>by PSAistudio | Line: @255yxtaf</Text>
        </div>
        {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: 'Sign In',
              children: (
                <Form onFinish={onLogin} layout="vertical">
                  <Form.Item name="username" rules={[{ required: true, message: 'Please enter your username or email' }]}>
                    <Input prefix={<UserOutlined />} placeholder="Username or Email" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                      Sign In
                    </Button>
                  </Form.Item>
                  <Text type="secondary" style={{ fontSize: 12 }}>Admin default: admin / admin123</Text>
                </Form>
              ),
            },
            {
              key: 'register',
              label: 'Register',
              children: (
                <Form onFinish={onRegister} layout="vertical">
                  <Form.Item name="name" rules={[{ required: true, message: 'Please enter your business name' }]}>
                    <Input prefix={<UserOutlined />} placeholder="Business Name" size="large" />
                  </Form.Item>
                  <Form.Item name="email" rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' },
                  ]}>
                    <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[
                    { required: true, message: 'Please enter your password' },
                    { min: 8, message: 'Password must be at least 8 characters' },
                  ]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Password (min 8 chars)" size="large" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                      Create Account
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
