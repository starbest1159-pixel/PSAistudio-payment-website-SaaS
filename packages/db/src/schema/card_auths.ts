import { pgTable, uuid, varchar, numeric, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { cards } from './cards';

export const cardAuthStatusEnum = pgEnum('card_auth_status', ['pending', 'captured', 'reversed', 'declined']);

export const cardAuths = pgTable('card_auths', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').references(() => cards.id).notNull(),
  authCode: varchar('auth_code', { length: 20 }),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('THB').notNull(),
  merchantName: varchar('merchant_name', { length: 255 }),
  merchantCategory: varchar('merchant_category', { length: 50 }),
  status: cardAuthStatusEnum('status').default('pending').notNull(),
  authorizedAt: timestamp('authorized_at').defaultNow(),
  capturedAt: timestamp('captured_at'),
});
