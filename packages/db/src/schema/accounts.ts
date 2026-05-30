import { pgTable, uuid, varchar, numeric, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', ['savings', 'current', 'fx']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'frozen', 'closed']);

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountNumber: varchar('account_number', { length: 10 }).notNull().unique(),
  type: accountTypeEnum('type').notNull(),
  currency: varchar('currency', { length: 3 }).default('THB').notNull(),
  balance: numeric('balance', { precision: 18, scale: 2 }).default('0').notNull(),
  availableBalance: numeric('available_balance', { precision: 18, scale: 2 }).default('0').notNull(),
  status: accountStatusEnum('status').default('active').notNull(),
  customerId: varchar('customer_id', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
});
