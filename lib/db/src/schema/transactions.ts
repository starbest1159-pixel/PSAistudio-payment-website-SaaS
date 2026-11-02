import { pgTable, uuid, varchar, numeric, timestamp, text, jsonb, integer } from 'drizzle-orm/pg-core';
import { merchants } from './merchants';

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id),
  type: varchar('type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('THB'),
  reference: varchar('reference', { length: 100 }).unique(),
  description: text('description'),
  metadata: jsonb('metadata'),
  callbackUrl: text('callback_url'),
  externalRef: text('external_ref'),
  webhookAttempts: integer('webhook_attempts').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
