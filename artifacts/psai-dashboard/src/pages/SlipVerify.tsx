import React, { useState, useRef } from 'react';
import { Upload, Button, Card, Typography, Alert, Descriptions, Tag } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function SlipVerify() {
  const [result, setResult] = useState<any>(null);
  const verify = useMutation({
    mutationFn: (base64: string) => api.post('/slip/verify', { imageBase64: base64 }).then(r => r.data),
    onSuccess: setResult,
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = (e.target?.result as string).split(',')[1];
      verify.mutate(b64);
    };
    reader.readAsDataURL(file);
    return false;
  };

  return (
    <Card>
      <Title level={4}>Slip Verification</Title>
      <Dragger beforeUpload={handleFile} showUploadList={false} accept="image/*" style={{ marginBottom: 24 }}>
        <p><InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} /></p>
        <p>Click or drag a payment slip image to verify</p>
        <p style={{ color: '#888' }}>SHA-256 deduplication check</p>
      </Dragger>
      {verify.isPending && <Alert message="Verifying..." type="info" />}
      {result && (
        <Alert
          message={result.valid ? 'Slip Accepted' : 'Duplicate Slip'}
          description={<Text copyable>{result.hash}</Text>}
          type={result.valid ? 'success' : 'error'}
        />
      )}
      {verify.isError && <Alert message="Verification failed" type="error" />}
    </Card>
  );
}
