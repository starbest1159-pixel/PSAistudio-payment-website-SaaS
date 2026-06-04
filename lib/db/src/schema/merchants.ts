import { pgTable, uuid, varchar, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core';

export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  promptpayId: varchar('promptpay_id', { length: 50 }),
  webhookUrl: text('webhook_url'),
  webhookSecret: text('webhook_secret'),
  autoApproveLimit: numeric('auto_approve_limit', { precision: 15, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
