import { pgTable, uuid, varchar, boolean, timestamp, text, numeric, integer } from 'drizzle-orm/pg-core';
import { merchants } from './merchants';

export const bankConnections = pgTable('bank_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id),
  bankCode: varchar('bank_code', { length: 10 }).notNull(),
  accountNumber: varchar('account_number', { length: 20 }).notNull(),
  accountName: varchar('account_name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  credentials: text('credentials'),
  verificationStatus: varchar('verification_status', { length: 20 }).default('pending'),
  verificationDepositAmount: numeric('verification_deposit_amount', { precision: 10, scale: 2 }),
  verificationDepositSentAt: timestamp('verification_deposit_sent_at'),
  verifiedAt: timestamp('verified_at'),
  verificationAttempts: integer('verification_attempts').default(0),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const THAI_BANKS = ['BBL','KBANK','KTB','BAY','SCB','TMB','UOB','GSB'] as const;

export type VerificationStatus = 'pending' | 'deposit_sent' | 'verified' | 'rejected';
