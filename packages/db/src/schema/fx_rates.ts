import { pgTable, uuid, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';

export const fxRates = pgTable('fx_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  baseCurrency: varchar('base_currency', { length: 3 }).default('THB').notNull(),
  quoteCurrency: varchar('quote_currency', { length: 3 }).notNull(),
  rate: numeric('rate', { precision: 18, scale: 8 }).notNull(),
  source: varchar('source', { length: 50 }),
  effectiveAt: timestamp('effective_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
