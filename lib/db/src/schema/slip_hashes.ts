import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const slipHashes = pgTable('slip_hashes', {
  id: uuid('id').primaryKey().defaultRandom(),
  hash: varchar('hash', { length: 64 }).notNull().unique(),
  depositId: uuid('deposit_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
