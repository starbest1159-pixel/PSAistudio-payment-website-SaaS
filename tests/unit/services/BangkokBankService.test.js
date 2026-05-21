/**
 * Bangkok Bank Payment Service Unit Tests
 */

const BangkokBankService = require('../../src/services/gateways/BangkokBankService');

describe('BangkokBankService', () => {
  beforeEach(() => {
    // Mock environment variables
    process.env.BKKBANK_API_URL = 'https://api.sandbox.bangkokbank.com/v1';
    process.env.BKKBANK_MERCHANT_ID = 'TEST_MERCHANT';
    process.env.BKKBANK_API_KEY = 'test_key';
    process.env.BKKBANK_SECRET = 'test_secret';
    process.env.APP_URL = 'https://app.test.com';
    process.env.API_URL = 'https://api.test.com';
  });

  describe('Signature Generation', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const payload = { amount: 1000, currency: 'THB' };
      const signature = BangkokBankService._generateSignature(payload);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex length
    });

    it('should generate same signature for same payload', () => {
      const payload = { amount: 1000 };
      const sig1 = BangkokBankService._generateSignature(payload);
      const sig2 = BangkokBankService._generateSignature(payload);
      
      expect(sig1).toBe(sig2);
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify valid webhook signature', () => {
      const payload = { orderId: 'ORD123', status: 'COMPLETED' };
      const timestamp = Date.now().toString();
      const message = `${JSON.stringify(payload)}${timestamp}`;
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.BKKBANK_SECRET)
        .update(message)
        .digest('hex');

      expect(() => {
        BangkokBankService.verifyWebhookSignature(payload, signature, timestamp);
      }).not.toThrow();
    });

    it('should reject invalid signature', () => {
      const payload = { orderId: 'ORD123' };
      const timestamp = Date.now().toString();
      const invalidSignature = 'invalid_signature_here';

      expect(() => {
        BangkokBankService.verifyWebhookSignature(payload, invalidSignature, timestamp);
      }).toThrow('Invalid webhook signature');
    });

    it('should reject expired timestamp', () => {
      const payload = { orderId: 'ORD123' };
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 min ago
      const message = `${JSON.stringify(payload)}${oldTimestamp}`;
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.BKKBANK_SECRET)
        .update(message)
        .digest('hex');

      expect(() => {
        BangkokBankService.verifyWebhookSignature(payload, signature, oldTimestamp);
      }).toThrow('Webhook timestamp expired');
    });
  });

  describe('Error Code Mapping', () => {
    it('should map known error codes', () => {
      expect(BangkokBankService._mapErrorCode('INVALID_MERCHANT'))
        .toBe('Invalid merchant credentials');
      
      expect(BangkokBankService._mapErrorCode('INSUFFICIENT_FUNDS'))
        .toBe('Insufficient funds for transaction');
      
      expect(BangkokBankService._mapErrorCode('PAYMENT_FAILED'))
        .toBe('Payment processing failed');
    });

    it('should return default message for unknown error code', () => {
      expect(BangkokBankService._mapErrorCode('UNKNOWN_ERROR'))
        .toBe('Payment processing error, please try again');
    });
  });
});
