import { pgTable, uuid, varchar, numeric, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const loanStatusEnum = pgEnum('loan_status', ['originated', 'active', 'completed', 'defaulted']);

export const loans = pgTable('loans', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  customerId: varchar('customer_id', { length: 50 }),
  principal: numeric('principal', { precision: 18, scale: 2 }).notNull(),
  outstandingBalance: numeric('outstanding_balance', { precision: 18, scale: 2 }).notNull(),
  interestRate: numeric('interest_rate', { precision: 8, scale: 5 }).notNull(),
  term: integer('term').notNull(),
  status: loanStatusEnum('status').default('originated').notNull(),
  disbursedAt: timestamp('disbursed_at'),
  maturityDate: timestamp('maturity_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
