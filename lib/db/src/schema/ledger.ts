import { pgTable, uuid, varchar, numeric, timestamp, text } from 'drizzle-orm/pg-core';

export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id'),
  accountDebit: varchar('account_debit', { length: 100 }).notNull(),
  accountCredit: varchar('account_credit', { length: 100 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('THB'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});
