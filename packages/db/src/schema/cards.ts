import { pgTable, uuid, varchar, numeric, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const cardTypeEnum = pgEnum('card_type', ['debit', 'credit']);
export const cardBrandEnum = pgEnum('card_brand', ['visa', 'mastercard']);
export const cardStatusEnum = pgEnum('card_status', ['active', 'blocked', 'cancelled']);

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  cardNumber: varchar('card_number', { length: 255 }).notNull(),
  cardType: cardTypeEnum('card_type').notNull(),
  cardBrand: cardBrandEnum('card_brand').notNull(),
  expiryMonth: integer('expiry_month').notNull(),
  expiryYear: integer('expiry_year').notNull(),
  status: cardStatusEnum('status').default('active').notNull(),
  dailyLimit: numeric('daily_limit', { precision: 18, scale: 2 }).default('200000'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
