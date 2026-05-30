import { pgTable, uuid, varchar, numeric, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { merchants } from './merchants';

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  bankCode: varchar('bank_code', { length: 10 }),
  accountNumber: varchar('account_number', { length: 20 }),
  accountName: varchar('account_name', { length: 255 }),
  status: varchar('status', { length: 20 }).default('pending'),
  autoApproved: boolean('auto_approved').default(false),
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
