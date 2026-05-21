# 🎨 Frontend React Payment Component Guide

**Last Updated:** 2026-05-20  
**Status:** Production-Ready  
**Framework:** React 18+

---

# Table of Contents

1. [Project Setup](#project-setup)
2. [Component Structure](#component-structure)
3. [Payment Component](#payment-component)
4. [Checkout Flow](#checkout-flow)
5. [Payment Methods](#payment-methods)
6. [State Management](#state-management)
7. [Styling & UX](#styling--ux)
8. [API Integration](#api-integration)
9. [Error Handling](#error-handling)
10. [Testing](#testing)

---

# Project Setup

## Installation

```bash
# Create React app
npx create-react-app payment-system
cd payment-system

# Install dependencies
npm install axios react-router-dom zustand qrcode.react antd @ant-design/icons
npm install --save-dev tailwindcss postcss autoprefixer

# Initialize Tailwind (optional)
npx tailwindcss init -p
```

## Directory Structure

```
src/
├── components/
│   ├── checkout/
│   │   ├── CheckoutPage.jsx
│   │   ├── OrderSummary.jsx
│   │   └── PaymentMethodSelector.jsx
│   ├── payment/
│   │   ├── PaymentForm.jsx
│   │   ├── PromptPayQR.jsx
│   │   ├── TrueMoneyPayment.jsx
│   │   └── BankPayment.jsx
│   ├── status/
│   │   ├── PaymentStatus.jsx
│   │   ├── SuccessPage.jsx
│   │   └── FailedPage.jsx
│   └── common/
│       ├── LoadingSpinner.jsx
│       └── ErrorAlert.jsx
├── hooks/
│   ├── usePayment.js
│   ├── useOrder.js
│   └── useApi.js
├── store/
│   ├── paymentStore.js
│   └── orderStore.js
├── services/
│   ├── api.js
│   ├── paymentService.js
│   └── orderService.js
├── utils/
│   ├── constants.js
│   ├── formatters.js
│   └── validators.js
├── App.jsx
└── index.jsx
```

---

# Component Structure

## Component Hierarchy

```
App
├── CheckoutPage
│   ├── OrderSummary
│   ├── PaymentMethodSelector
│   └── PaymentForm
│       ├── PromptPayQR (if promptpay selected)
│       ├── TrueMoneyPayment (if truemoney selected)
│       └── BankPayment (if bank selected)
└── PaymentStatus
    ├── SuccessPage (if payment successful)
    └── FailedPage (if payment failed)
```

---

# Payment Component

## 1. API Service

```javascript
// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add idempotency key for payment requests
    if (config.method === 'post' && config.url.includes('payments')) {
      config.headers['X-Idempotency-Key'] = generateIdempotencyKey();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Utility function to generate idempotency key
function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default apiClient;
```

## 2. Payment Service

```javascript
// src/services/paymentService.js
import apiClient from './api';

export const paymentService = {
  // Create order
  createOrder: (orderData) =>
    apiClient.post('/orders', orderData),

  // Get order details
  getOrder: (orderId) =>
    apiClient.get(`/orders/${orderId}`),

  // Create payment
  createPayment: (paymentData) =>
    apiClient.post('/payments', paymentData),

  // Get payment status
  getPaymentStatus: (paymentId) =>
    apiClient.get(`/payments/${paymentId}`),

  // Cancel payment
  cancelPayment: (paymentId) =>
    apiClient.post(`/payments/${paymentId}/cancel`),

  // Retry payment
  retryPayment: (paymentId) =>
    apiClient.post(`/payments/${paymentId}/retry`),

  // Get refund status
  getRefundStatus: (refundId) =>
    apiClient.get(`/refunds/${refundId}`),

  // Request refund
  requestRefund: (paymentId, refundData) =>
    apiClient.post(`/payments/${paymentId}/refund`, refundData),

  // Poll payment status (with exponential backoff)
  pollPaymentStatus: async (paymentId, maxAttempts = 12, initialDelay = 5000) => {
    let delay = initialDelay;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const payment = await paymentService.getPaymentStatus(paymentId);
        if (payment.status === 'paid' || payment.status === 'failed') {
          return payment;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
      delay = Math.min(delay * 1.5, 30000); // Max 30s delay
    }
    throw new Error('Payment status check timeout');
  },
};
```

## 3. Custom Hooks

```javascript
// src/hooks/usePayment.js
import { useState, useCallback } from 'react';
import { paymentService } from '../services/paymentService';

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payment, setPayment] = useState(null);

  const createPayment = useCallback(async (orderId, method) => {
    setLoading(true);
    setError(null);
    try {
      const paymentData = {
        order_id: orderId,
        method: method,
      };
      const result = await paymentService.createPayment(paymentData);
      setPayment(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to create payment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPaymentStatus = useCallback(async (paymentId) => {
    try {
      const result = await paymentService.getPaymentStatus(paymentId);
      setPayment(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to check payment status');
      throw err;
    }
  }, []);

  const pollPaymentStatus = useCallback(async (paymentId) => {
    setLoading(true);
    try {
      const result = await paymentService.pollPaymentStatus(paymentId);
      setPayment(result);
      return result;
    } catch (err) {
      setError(err.message || 'Payment status check timeout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelPayment = useCallback(async (paymentId) => {
    setLoading(true);
    setError(null);
    try {
      await paymentService.cancelPayment(paymentId);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to cancel payment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    payment,
    createPayment,
    checkPaymentStatus,
    pollPaymentStatus,
    cancelPayment,
  };
};
```

```javascript
// src/hooks/useOrder.js
import { useState, useCallback } from 'react';
import { paymentService } from '../services/paymentService';

export const useOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  const createOrder = useCallback(async (orderData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.createOrder(orderData);
      setOrder(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to create order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrder = useCallback(async (orderId) => {
    setLoading(true);
    try {
      const result = await paymentService.getOrder(orderId);
      setOrder(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to fetch order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    order,
    createOrder,
    getOrder,
  };
};
```

---

# Checkout Flow

## Main Checkout Page

```javascript
// src/components/checkout/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderSummary from './OrderSummary';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentForm from '../payment/PaymentForm';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { useOrder } from '../../hooks/useOrder';

const CheckoutPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { order, loading, error, getOrder } = useOrder();
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    if (orderId) {
      getOrder(orderId);
    }
  }, [orderId, getOrder]);

  const handlePaymentMethodSelect = (method) => {
    setSelectedMethod(method);
  };

  const handlePaymentSuccess = (paymentData) => {
    navigate(`/payment/status/${paymentData.payment_id}`, {
      state: { status: 'success' },
    });
  };

  const handlePaymentError = (errorMessage) => {
    console.error('Payment error:', errorMessage);
    // Keep on checkout page to allow retry
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!order) return <ErrorAlert message="Order not found" />;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column - Order summary */}
        <div className="md:col-span-1">
          <OrderSummary order={order} />
        </div>

        {/* Right column - Payment */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onSelect={handlePaymentMethodSelect}
            />
          </div>

          {selectedMethod && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
              <PaymentForm
                order={order}
                method={selectedMethod}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
```

## Order Summary Component

```javascript
// src/components/checkout/OrderSummary.jsx
import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const OrderSummary = ({ order }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-8">
      <h3 className="text-lg font-bold mb-4">Order Summary</h3>

      <div className="space-y-3 mb-4 pb-4 border-b">
        {order.items?.map((item) => (
          <div key={item.item_id} className="flex justify-between">
            <span className="text-gray-600">
              {item.name} x {item.quantity}
            </span>
            <span className="font-semibold">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm mb-4 pb-4 border-b">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {order.tax > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
        )}
        {order.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(order.discount)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <span className="font-bold text-lg">Total</span>
        <span className="text-2xl font-bold text-blue-600">
          {formatCurrency(order.total)}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>
          <strong>Order ID:</strong> {order.order_id}
        </p>
        <p>
          <strong>Created:</strong> {formatDateTime(order.created_at)}
        </p>
        <p>
          <strong>Status:</strong>{' '}
          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            {order.status}
          </span>
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;
```

## Payment Method Selector

```javascript
// src/components/checkout/PaymentMethodSelector.jsx
import React from 'react';
import { Card, Radio } from 'antd';
import {
  CreditCardOutlined,
  QrcodeOutlined,
  WalletOutlined,
} from '@ant-design/icons';

const PAYMENT_METHODS = [
  {
    id: 'promptpay',
    label: 'PromptPay QR Code',
    icon: <QrcodeOutlined className="text-2xl" />,
    description: 'Scan QR code with your bank app',
    fee: 0,
  },
  {
    id: 'truemoney',
    label: 'TrueMoney Wallet',
    icon: <WalletOutlined className="text-2xl" />,
    description: 'Pay with your TrueMoney account',
    fee: 0,
  },
  {
    id: 'bank',
    label: 'Internet Banking',
    icon: <CreditCardOutlined className="text-2xl" />,
    description: 'Transfer from your bank account',
    fee: 0,
  },
];

const PaymentMethodSelector = ({ selectedMethod, onSelect }) => {
  return (
    <div className="space-y-3">
      <Radio.Group value={selectedMethod} onChange={(e) => onSelect(e.target.value)}>
        {PAYMENT_METHODS.map((method) => (
          <Card
            key={method.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onSelect(method.id)}
          >
            <Radio value={method.id} className="w-full">
              <div className="flex items-center justify-between w-full ml-2">
                <div className="flex items-center gap-3">
                  {method.icon}
                  <div>
                    <div className="font-semibold">{method.label}</div>
                    <div className="text-sm text-gray-500">
                      {method.description}
                    </div>
                  </div>
                </div>
                {method.fee > 0 && (
                  <div className="text-sm text-gray-600">+{method.fee} ฿</div>
                )}
              </div>
            </Radio>
          </Card>
        ))}
      </Radio.Group>
    </div>
  );
};

export default PaymentMethodSelector;
```

---

# Payment Methods

## 1. PromptPay QR Component

```javascript
// src/components/payment/PromptPayQR.jsx
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { Button, Space, message, Spin } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { usePayment } from '../../hooks/usePayment';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { formatCurrency, formatTime } from '../../utils/formatters';

const PromptPayQR = ({ order, onSuccess, onError }) => {
  const { createPayment, pollPaymentStatus, loading, error, payment } = usePayment();
  const [qrCode, setQrCode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  // Create payment and get QR code
  useEffect(() => {
    handleCreatePayment();
  }, [order.order_id]);

  const handleCreatePayment = async () => {
    try {
      const paymentData = await createPayment(order.order_id, 'promptpay');
      setQrCode(paymentData);
      startTimer(paymentData.expired_at);
      startPolling(paymentData.payment_id);
    } catch (err) {
      onError(err.message);
    }
  };

  // Timer for QR expiration
  const startTimer = (expiredAt) => {
    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(expiredAt);
      const diff = expiry - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(null);
        message.error('QR code has expired');
      } else {
        setTimeLeft(Math.ceil(diff / 1000));
      }
    }, 1000);
  };

  // Poll for payment completion
  const startPolling = async (paymentId) => {
    setIsPolling(true);
    try {
      const result = await pollPaymentStatus(paymentId);
      if (result.status === 'paid') {
        message.success('Payment successful!');
        onSuccess(result);
      } else {
        message.error('Payment failed');
        onError('Payment failed');
      }
    } catch (err) {
      console.error('Polling error:', err);
    } finally {
      setIsPolling(false);
    }
  };

  const handleCopyReference = () => {
    navigator.clipboard.writeText(qrCode.reference);
    message.success('Reference number copied');
  };

  const handleDownloadQR = () => {
    const qrElement = document.getElementById('promptpay-qr');
    const canvas = qrElement.querySelector('canvas');
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `promptpay-${qrCode.reference}.png`;
    link.click();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!qrCode) return <ErrorAlert message="Failed to generate QR code" />;

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <div className="flex flex-col items-center bg-gray-50 p-8 rounded-lg">
        <div
          id="promptpay-qr"
          className="bg-white p-4 rounded-lg shadow"
        >
          <QRCode
            value={qrCode.qr_text}
            size={250}
            level="H"
            includeMargin={true}
          />
        </div>
        <p className="text-gray-500 mt-4 text-sm">
          Scan this QR code with your bank app
        </p>
      </div>

      {/* Payment Details */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Reference No.</p>
            <p className="font-mono font-bold text-lg">{qrCode.reference}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Amount</p>
            <p className="font-bold text-lg">
              {formatCurrency(qrCode.amount)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Time Left</p>
            <p className={`font-bold ${timeLeft < 60 ? 'text-red-600' : ''}`}>
              {timeLeft ? formatTime(timeLeft) : 'Expired'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Status</p>
            <p className="font-bold">
              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                {qrCode.status}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold mb-2">📱 How to Pay</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Open your bank mobile app</li>
          <li>Select "Scan QR Code"</li>
          <li>Scan the QR code above</li>
          <li>Verify the amount: {formatCurrency(qrCode.amount)}</li>
          <li>Enter your PIN and confirm</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <Space className="w-full justify-center" wrap>
        <Button
          type="primary"
          icon={<CopyOutlined />}
          onClick={handleCopyReference}
        >
          Copy Reference
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadQR}
        >
          Download QR
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleCreatePayment}
        >
          Generate New QR
        </Button>
      </Space>

      {/* Status Indicator */}
      {isPolling && (
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Spin size="small" />
          <span>Waiting for payment...</span>
        </div>
      )}
    </div>
  );
};

export default PromptPayQR;
```

## 2. TrueMoney Wallet Component

```javascript
// src/components/payment/TrueMoneyPayment.jsx
import React, { useState, useEffect } from 'react';
import { Button, message, Spin } from 'antd';
import { ExternalLinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { usePayment } from '../../hooks/usePayment';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { formatCurrency } from '../../utils/formatters';

const TrueMoneyPayment = ({ order, onSuccess, onError }) => {
  const { createPayment, checkPaymentStatus, loading, error, payment } = usePayment();
  const [redirectUrl, setRedirectUrl] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    handleCreatePayment();
  }, [order.order_id]);

  const handleCreatePayment = async () => {
    try {
      const paymentData = await createPayment(order.order_id, 'truemoney');
      setPaymentId(paymentData.payment_id);
      setRedirectUrl(paymentData.redirect_url);
    } catch (err) {
      onError(err.message);
    }
  };

  const handleProceedToPayment = () => {
    if (redirectUrl) {
      // Open payment in new window and check status
      const paymentWindow = window.open(redirectUrl, 'truemoney_payment');

      // Check payment status every 5 seconds
      const checkInterval = setInterval(async () => {
        try {
          const result = await checkPaymentStatus(paymentId);
          if (result.status === 'paid') {
            clearInterval(checkInterval);
            paymentWindow?.close();
            message.success('Payment successful!');
            onSuccess(result);
          } else if (result.status === 'failed') {
            clearInterval(checkInterval);
            message.error('Payment failed');
            onError('Payment failed');
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 5000);

      // Clear interval after 10 minutes
      setTimeout(() => clearInterval(checkInterval), 10 * 60 * 1000);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const result = await checkPaymentStatus(paymentId);
      if (result.status === 'paid') {
        message.success('Payment successful!');
        onSuccess(result);
      } else if (result.status === 'failed') {
        message.error('Payment failed');
        onError('Payment failed');
      } else {
        message.info(`Payment status: ${result.status}`);
      }
    } catch (err) {
      message.error('Failed to check status');
    } finally {
      setIsChecking(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!redirectUrl) return <ErrorAlert message="Failed to create payment" />;

  return (
    <div className="space-y-6">
      {/* Payment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Payment Method</p>
            <p className="font-bold">TrueMoney Wallet</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Amount</p>
            <p className="font-bold text-lg text-green-600">
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold mb-2">📱 How to Pay</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click the button below to proceed to TrueMoney</li>
          <li>Log in to your TrueMoney account</li>
          <li>Review the payment details</li>
          <li>Confirm the payment with OTP</li>
          <li>You will be redirected back automatically</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          type="primary"
          size="large"
          block
          icon={<ExternalLinkOutlined />}
          onClick={handleProceedToPayment}
        >
          Proceed to TrueMoney Wallet
        </Button>

        <Button
          size="large"
          block
          icon={<ReloadOutlined />}
          onClick={handleCheckStatus}
          loading={isChecking}
        >
          Check Payment Status
        </Button>
      </div>

      {/* Warning Message */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">
          ⚠️ <strong>Important:</strong> Do not close this window until payment is complete.
          Use "Check Payment Status" button if you return without confirmation.
        </p>
      </div>
    </div>
  );
};

export default TrueMoneyPayment;
```

## 3. Bank Transfer Component

```javascript
// src/components/payment/BankPayment.jsx
import React, { useState } from 'react';
import { Button, Select, message } from 'antd';
import { ExternalLinkOutlined } from '@ant-design/icons';
import { usePayment } from '../../hooks/usePayment';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { formatCurrency } from '../../utils/formatters';

const BANKS = [
  { code: 'KBANK', name: 'Kasikornbank (ธนาคารกสิกรไทย)', logo: '🏦' },
  { code: 'BBL', name: 'Bangkok Bank (ธนาคารพืชกรรม)', logo: '🏦' },
  { code: 'BAY', name: 'Bank of Ayudhya (ธนาคารอยุธยา)', logo: '🏦' },
  { code: 'TTB', name: 'Thai Thai Bank (ธนาคารไทยธนาชาต)', logo: '🏦' },
  { code: 'GHB', name: 'GHBANK (ธนาคารเอกชน)', logo: '🏦' },
];

const BankPayment = ({ order, onSuccess, onError }) => {
  const { createPayment, checkPaymentStatus, loading, error } = usePayment();
  const [selectedBank, setSelectedBank] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectBank = (bankCode) => {
    setSelectedBank(bankCode);
    setPaymentData(null);
  };

  const handleCreateBankPayment = async () => {
    if (!selectedBank) {
      message.error('Please select a bank');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createPayment(order.order_id, 'bank');
      setPaymentData({
        ...result,
        bank_code: selectedBank,
      });
    } catch (err) {
      onError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedToBank = () => {
    if (paymentData?.redirect_url) {
      window.open(paymentData.redirect_url, '_blank');
      // Check status after user returns
      setTimeout(() => handleCheckStatus(), 3000);
    }
  };

  const handleCheckStatus = async () => {
    if (paymentData?.payment_id) {
      try {
        const result = await checkPaymentStatus(paymentData.payment_id);
        if (result.status === 'paid') {
          message.success('Payment successful!');
          onSuccess(result);
        } else {
          message.info(`Payment status: ${result.status}`);
        }
      } catch (err) {
        message.error('Failed to check status');
      }
    }
  };

  if (loading && !paymentData) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  if (!paymentData) {
    return (
      <div className="space-y-6">
        {/* Bank Selection */}
        <div>
          <label className="block text-sm font-semibold mb-3">
            Select Your Bank
          </label>
          <Select
            placeholder="Choose a bank..."
            size="large"
            value={selectedBank}
            onChange={handleSelectBank}
            options={BANKS.map((bank) => ({
              label: `${bank.logo} ${bank.name}`,
              value: bank.code,
            }))}
          />
        </div>

        {/* Payment Info */}
        {selectedBank && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Selected Bank</p>
                <p className="font-bold">
                  {BANKS.find((b) => b.code === selectedBank)?.name}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Amount</p>
                <p className="font-bold text-lg text-green-600">
                  {formatCurrency(order.total)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">🏦 How to Pay</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Select your bank from the dropdown</li>
            <li>Click "Proceed to Internet Banking"</li>
            <li>Log in to your bank account</li>
            <li>Confirm the payment</li>
            <li>Return to this page and click "Check Payment Status"</li>
          </ol>
        </div>

        {/* Action Button */}
        <Button
          type="primary"
          size="large"
          block
          onClick={handleCreateBankPayment}
          disabled={!selectedBank}
          loading={isProcessing}
        >
          Create Payment Request
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Created */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-semibold">✓ Payment request created</p>
        <p className="text-sm text-green-700 mt-1">
          Reference: {paymentData.payment_id}
        </p>
      </div>

      {/* Payment Details */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Bank</p>
            <p className="font-bold">
              {BANKS.find((b) => b.code === selectedBank)?.name}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Amount</p>
            <p className="font-bold text-lg">
              {formatCurrency(order.total)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Payment ID</p>
            <p className="font-mono text-sm">{paymentData.payment_id}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Status</p>
            <p className="font-bold">
              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                Pending
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          type="primary"
          size="large"
          block
          icon={<ExternalLinkOutlined />}
          onClick={handleProceedToBank}
        >
          Open Internet Banking
        </Button>

        <Button
          size="large"
          block
          onClick={handleCheckStatus}
        >
          Check Payment Status
        </Button>

        <Button
          type="link"
          block
          onClick={() => {
            setPaymentData(null);
            setSelectedBank(null);
          }}
        >
          Change Bank
        </Button>
      </div>
    </div>
  );
};

export default BankPayment;
```

---

# State Management

## Zustand Store (Optional)

```javascript
// src/store/paymentStore.js
import create from 'zustand';

export const usePaymentStore = create((set) => ({
  // State
  orders: [],
  payments: {},
  currentPayment: null,
  notificationQueue: [],

  // Actions
  setOrders: (orders) => set({ orders }),
  setPayment: (paymentId, payment) =>
    set((state) => ({
      payments: { ...state.payments, [paymentId]: payment },
    })),
  setCurrentPayment: (payment) => set({ currentPayment: payment }),
  addNotification: (notification) =>
    set((state) => ({
      notificationQueue: [...state.notificationQueue, notification],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notificationQueue: state.notificationQueue.filter((n) => n.id !== id),
    })),

  // Getters
  getPayment: (paymentId) => (state) => state.payments[paymentId],
  getOrder: (orderId) => (state) =>
    state.orders.find((o) => o.order_id === orderId),
}));
```

---

# Styling & UX

## Utility Formatters

```javascript
// src/utils/formatters.js
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDateTime = (dateString) => {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const formatPhoneNumber = (phone) => {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
};
```

## Common Components

```javascript
// src/components/common/LoadingSpinner.jsx
import React from 'react';
import { Spin } from 'antd';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Spin size="large" />
    <p className="mt-4 text-gray-600">{message}</p>
  </div>
);

export default LoadingSpinner;
```

```javascript
// src/components/common/ErrorAlert.jsx
import React from 'react';
import { Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const ErrorAlert = ({ message, onRetry }) => (
  <Alert
    message="Error"
    description={message}
    type="error"
    showIcon
    action={
      onRetry && (
        <Button
          size="small"
          danger
          icon={<ReloadOutlined />}
          onClick={onRetry}
        >
          Retry
        </Button>
      )
    }
    className="my-4"
  />
);

export default ErrorAlert;
```

---

# API Integration

## Payment Form (Main Component)

```javascript
// src/components/payment/PaymentForm.jsx
import React from 'react';
import PromptPayQR from './PromptPayQR';
import TrueMoneyPayment from './TrueMoneyPayment';
import BankPayment from './BankPayment';

const PaymentForm = ({ order, method, onSuccess, onError }) => {
  const renderPaymentComponent = () => {
    switch (method) {
      case 'promptpay':
        return (
          <PromptPayQR
            order={order}
            onSuccess={onSuccess}
            onError={onError}
          />
        );
      case 'truemoney':
        return (
          <TrueMoneyPayment
            order={order}
            onSuccess={onSuccess}
            onError={onError}
          />
        );
      case 'bank':
        return (
          <BankPayment
            order={order}
            onSuccess={onSuccess}
            onError={onError}
          />
        );
      default:
        return <div>Unknown payment method</div>;
    }
  };

  return <div>{renderPaymentComponent()}</div>;
};

export default PaymentForm;
```

---

# Error Handling

## Error Boundary

```javascript
// src/components/ErrorBoundary.jsx
import React from 'react';
import { Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Alert
            message="Something went wrong"
            description={this.state.error?.message}
            type="error"
            showIcon
            action={
              <Button
                size="small"
                danger
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

# Testing

## Component Testing Example

```javascript
// src/components/payment/__tests__/PromptPayQR.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptPayQR from '../PromptPayQR';
import * as paymentService from '../../../services/paymentService';

jest.mock('../../../services/paymentService');

describe('PromptPayQR Component', () => {
  const mockOrder = {
    order_id: 'ORD123',
    total: 299.00,
    items: [],
  };

  const mockPaymentData = {
    payment_id: 'PAY001',
    method: 'promptpay',
    status: 'pending',
    amount: 299.00,
    qr_text: 'PROMPTPAY_QR_TEXT',
    reference: 'PP20260307001',
    expired_at: new Date(Date.now() + 15 * 60000).toISOString(),
  };

  beforeEach(() => {
    paymentService.createPayment.mockResolvedValue(mockPaymentData);
    paymentService.pollPaymentStatus.mockResolvedValue({
      ...mockPaymentData,
      status: 'paid',
    });
  });

  test('renders QR code component', async () => {
    render(
      <PromptPayQR
        order={mockOrder}
        onSuccess={() => {}}
        onError={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Scan this QR code/)).toBeInTheDocument();
    });
  });

  test('displays reference number', async () => {
    render(
      <PromptPayQR
        order={mockOrder}
        onSuccess={() => {}}
        onError={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(mockPaymentData.reference)).toBeInTheDocument();
    });
  });

  test('copy reference button works', async () => {
    const user = userEvent.setup();
    render(
      <PromptPayQR
        order={mockOrder}
        onSuccess={() => {}}
        onError={() => {}}
      />
    );

    const copyButton = await screen.findByText(/Copy Reference/);
    await user.click(copyButton);

    // Verify clipboard content (in real test)
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  test('calls onSuccess when payment is completed', async () => {
    const mockOnSuccess = jest.fn();
    render(
      <PromptPayQR
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={() => {}}
      />
    );

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paid' })
      );
    });
  });
});
```

---

# Environment Variables

```bash
# .env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_PAYMENT_GATEWAY=omise
REACT_APP_TIMEOUT=30000
REACT_APP_POLLING_INTERVAL=5000
REACT_APP_ENVIRONMENT=development
```

---

# App Routing

```javascript
// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import CheckoutPage from './components/checkout/CheckoutPage';
import PaymentStatus from './components/status/PaymentStatus';
import SuccessPage from './components/status/SuccessPage';
import FailedPage from './components/status/FailedPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/checkout/:orderId" element={<CheckoutPage />} />
          <Route path="/payment/status/:paymentId" element={<PaymentStatus />} />
          <Route path="/payment/success" element={<SuccessPage />} />
          <Route path="/payment/failed" element={<FailedPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
```

---

# Production Checklist

✅ **Before Deploying to Production:**

- [ ] All API endpoints configured correctly
- [ ] Environment variables set
- [ ] Error handling tested
- [ ] Payment gateway credentials verified
- [ ] SSL/HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting in place
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Security audit passed
- [ ] Load testing completed
- [ ] Backup & recovery plan ready

---

# Deployment Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start

# Docker build
docker build -t payment-app:latest .

# Docker run
docker run -p 3000:3000 payment-app:latest
```

---

# Summary

This complete React payment component system includes:

✅ All 3 payment methods (PromptPay, TrueMoney, Banking)  
✅ Custom hooks for payment management  
✅ API integration with error handling  
✅ Real-time status polling  
✅ Comprehensive UI/UX  
✅ Testing examples  
✅ Production-ready code  

**Ready to integrate!** 🚀

