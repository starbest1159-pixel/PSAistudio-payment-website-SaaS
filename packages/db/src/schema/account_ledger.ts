import { pgTable, uuid, varchar, numeric, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const entryTypeEnum = pgEnum('entry_type', ['debit', 'credit']);
export const ledgerTypeEnum = pgEnum('ledger_type', [
  'deposit',
  'withdrawal',
  'transfer',
  'loan_disbursement',
  'interest',
  'fee',
  'card_settlement',
]);

export const accountLedger = pgTable('account_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  entryType: entryTypeEnum('entry_type').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('THB').notNull(),
  reference: varchar('reference', { length: 100 }),
  contraAccountId: uuid('contra_account_id').references(() => accounts.id),
  ledgerType: ledgerTypeEnum('ledger_type').notNull(),
  description: varchar('description', { length: 500 }),
  balanceAfterEntry: numeric('balance_after_entry', { precision: 18, scale: 2 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
