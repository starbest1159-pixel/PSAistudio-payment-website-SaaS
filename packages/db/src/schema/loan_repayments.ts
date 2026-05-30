import { pgTable, uuid, numeric, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { loans } from './loans';

export const repaymentStatusEnum = pgEnum('repayment_status', ['pending', 'completed', 'failed']);

export const loanRepayments = pgTable('loan_repayments', {
  id: uuid('id').primaryKey().defaultRandom(),
  loanId: uuid('loan_id').references(() => loans.id).notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  principalPortion: numeric('principal_portion', { precision: 18, scale: 2 }).notNull(),
  interestPortion: numeric('interest_portion', { precision: 18, scale: 2 }).notNull(),
  status: repaymentStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
