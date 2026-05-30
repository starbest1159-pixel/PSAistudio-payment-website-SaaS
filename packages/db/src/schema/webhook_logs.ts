import { pgTable, uuid, varchar, integer, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { merchants } from './merchants';

export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id),
  event: varchar('event', { length: 100 }).notNull(),
  url: text('url').notNull(),
  payload: jsonb('payload'),
  statusCode: integer('status_code'),
  response: text('response'),
  success: boolean('success').default(false),
  attempt: integer('attempt').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});
